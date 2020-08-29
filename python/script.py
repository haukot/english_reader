import spacy

nlp = spacy.load("en_core_web_sm")

tags = {
    'NOUN': 'n',
    'ADJ': 'j',
    'ADV': 'd',
    'VERB': 'v'
}


def process_book(book):
    part_start_idx = 0
    book_tags_offset = 0
    pages = []
    page_length = 8000
    res_book = ""

    def transform(part):
        nonlocal book_tags_offset

        offset = 0
        cur_page_start = 0

        doc = nlp(part)
        for sent in doc.sents:
            sent_idx = offset + sent.start_char
            sent_end_idx = offset + sent.end_char

            text = part[sent_idx:sent_end_idx]
            sent_offset = -sent.start_char

            for token in sent:
                tag = tags.get(token.pos_, 'x')
                idx = sent_offset + token.idx
                end_idx = sent_offset + token.idx + len(token.text)
                # print(token.text, token.idx, idx, end_idx, offset, sent_idx, text)
                if (tag != 'x'):
                    text = text[:idx] + '<span t="' + tag + '">' + text[idx:end_idx] + '</span>' + text[end_idx:]

                    sent_offset = sent_offset + 19 # added span tag length
                    offset = offset + 19

            part = part[:sent_idx] + '<span class="sentence">' + text + '</span>' + part[sent_end_idx:]
            offset = offset + 30 # added span tag length

            # detect pages
            end_idx = sent.end_char + offset
            if (end_idx - cur_page_start > page_length):
                pages.append([
                    cur_page_start + book_tags_offset + part_start_idx,
                    end_idx + book_tags_offset + part_start_idx
                ])
                cur_page_start = end_idx

        book_tags_offset = book_tags_offset + offset
        return part

    while True:
        # Split to part to more smooth memory consumption
        min_part_size = 20000
        end_idx = book.find('\n', part_start_idx + min_part_size)
        if (end_idx == -1):
            end_idx = part_start_idx + min_part_size

        part = book[part_start_idx:end_idx]

        new_part = transform(part)
        res_book = res_book + new_part

        if (end_idx > len(book)):
            break
        part_start_idx = end_idx

    end_book_idx = len(book) + book_tags_offset
    if (len(pages) == 0):
        pages.append([0, end_book_idx])
    if (pages[-1][1] < end_book_idx):
        pages.append([pages[-1][0] + 1, end_book_idx])

    res = {'pages': pages, 'text': res_book}

    return res
