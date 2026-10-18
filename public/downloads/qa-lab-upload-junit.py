"""Upload JUnit XML to QA Lab using Python's standard library only."""
import glob
import json
import math
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


def collect(pattern):
    paths = sorted(glob.glob(pattern, recursive=True))
    if not paths:
        raise ValueError('No JUnit files matched. Configure your test runner and QA_LAB_JUNIT_GLOB.')
    cases = []
    size = 0
    for path in paths:
        with open(path, 'rb') as report:
            content = report.read(5 * 1024 * 1024 + 1)
        size += len(content)
        if size > 5 * 1024 * 1024:
            raise ValueError('JUnit XML exceeds the 5 MB input limit. Split large suites across CI jobs.')
        text = content.decode('utf-8-sig')
        if '<!DOCTYPE' in text.upper() or '<!ENTITY' in text.upper():
            raise ValueError('DTD and entity declarations are not supported.')
        root = ET.fromstring(text)
        for element in root.iter():
            element.tag = element.tag.rsplit('}', 1)[-1]
        for case in root.iter('testcase'):
            failure = case.find('failure')
            if failure is None:
                failure = case.find('error')
            duration = float(case.get('time', '0'))
            if not math.isfinite(duration) or not 0 <= duration <= 604800:
                raise ValueError('Invalid test duration')
            cases.append({
                'title': (case.get('name') or 'Unnamed test')[:500],
                'module': (case.get('classname') or root.get('name') or 'Suite')[:300],
                'status': 'Fail' if failure is not None else 'Skipped' if case.find('skipped') is not None else 'Pass',
                'actual': ((failure.get('message', '') + '\n' + (failure.text or '')).strip() if failure is not None else '')[:6000],
                'duration': duration,
            })
            if len(cases) > 5000:
                raise ValueError('More than 5000 tests. Split results into separate CI jobs with unique upload keys.')
    if not cases:
        raise ValueError('JUnit files contain no test cases')
    return cases


def main():
    api = os.environ['QA_LAB_API_URL'].rstrip('/')
    parsed = urllib.parse.urlparse(api)
    if parsed.username or parsed.password or parsed.query or parsed.fragment or not (parsed.scheme == 'https' or parsed.scheme == 'http' and parsed.hostname in ('localhost', '127.0.0.1')):
        raise ValueError('QA_LAB_API_URL must use HTTPS (HTTP is allowed for localhost only)')
    run_id = os.environ['GITHUB_RUN_ID']
    attempt = int(os.environ.get('GITHUB_RUN_ATTEMPT', '1'))
    payload = {
        'externalKey': f'{run_id}:{attempt}', 'runId': run_id, 'attempt': attempt,
        'job': os.environ.get('QA_LAB_UPLOAD_KEY', os.environ.get('GITHUB_JOB', 'tests')),
        'name': os.environ.get('QA_LAB_RUN_NAME', os.environ.get('GITHUB_WORKFLOW', 'Automated tests'))[:200],
        'repository': os.environ['GITHUB_REPOSITORY'],
        'branch': os.environ.get('GITHUB_HEAD_REF') or os.environ.get('GITHUB_REF_NAME', ''),
        'commit': os.environ['GITHUB_SHA'],
        'environment': os.environ.get('QA_LAB_ENVIRONMENT') or 'CI',
        'pullRequest': int(os.environ['QA_LAB_PR_NUMBER']) if os.environ.get('QA_LAB_PR_NUMBER') else None,
        'cases': collect(os.environ.get('QA_LAB_JUNIT_GLOB', 'test-results/**/*.xml')),
    }
    body = json.dumps(payload).encode()
    if len(body) > 5 * 1024 * 1024:
        raise ValueError('Result payload exceeds 5 MB; reduce failure output or split the report')
    request = urllib.request.Request(api + '/ci/results', data=body, headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + os.environ['QA_LAB_TOKEN']}, method='POST')
    # Never forward the token to another location through an HTTP redirect.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    with urllib.request.build_opener(NoRedirect).open(request, timeout=45) as response:
        result = json.load(response)
    print('QA Lab result received. Run:', result['id'], '(already uploaded)' if result.get('duplicate') else '')


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as error:
        print(f'QA Lab upload failed (HTTP {error.code}). Check token, repository configuration, and result format.', file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        # Do not print response bodies or request headers containing credentials.
        print(f'QA Lab upload failed: {type(error).__name__}. Check configuration and JUnit files.', file=sys.stderr)
        sys.exit(1)
