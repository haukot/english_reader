import json
from script import process_book

with open('test/test.txt', 'r') as file:
    file_str = file.read()
    processed = process_book(file_str)

    # with open('test/text_processed.json', 'w') as f:
    #     f.write(json.dumps(processed))

    with open('test/text_processed.json', 'r') as f:
        expected_str = f.read()
        expected = json.loads(expected_str)
        assert processed['pages'] == expected['pages'], "Pages are not matched\n\n" + json.dumps(processed['pages'])
        assert processed['text'] == expected['text'], "Text is not matched\n\n" + processed['text']
        assert json.dumps(processed) == expected_str, "Something is not matched\n\n" + json.dumps(processed)

    print("Success!")
