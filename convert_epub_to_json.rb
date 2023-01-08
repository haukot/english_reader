require 'nokogiri'
require 'json'

## Run in the folder of epub
## where should be texts like text0001.html, text0002.html, etc



def clean_html(div)
    return nil if div.nil?

    div.xpath('.//a').each do |a_el|
        # remove all attributes
        a_el.attributes.each do |attr|
            a_el.remove_attribute(attr[0])
        end
    end
    # remove all span tags, but keep the content
    while div.xpath('.//span').length > 0
        div.xpath('.//span').each do |span|
            span.replace(span.inner_html)
        end
    end
    while div.xpath('.//div').length > 0
        div.xpath('.//div').each do |div|
            div.replace(div.inner_html)
        end
    end
    while div.xpath('.//blockquote').length > 0
        div.xpath('.//blockquote').each do |blockquote|
            blockquote.replace("<div>#{blockquote.inner_html}</div>")
        end
    end
    res = div.inner_html
    res.gsub!(/\n/, '')
    res.gsub!(/\r/, '')
    res.strip!
    res
end

def clean_heading(div)
    return nil if div.nil?
    # like fret<sup>1</sup> -> fret
    while div.xpath('.//sup').length > 0
        div.xpath('.//sup').each do |sup|
            sup.remove
        end
    end
    res = div.content
    res.gsub!(/\n/, '')
    res.gsub!(/\r/, '')
    res.strip!
    res
end

# for pretty printing
# doc = Nokogiri::XML(html,&:noblanks)
# puts doc

def process(html, words)
    doc = Nokogiri::HTML(html,&:noblanks)
    doc = doc.xpath("/html/body")

    word_div = doc.xpath('./div')[0]
    description_div = doc.xpath('./div')[1]
    origin_div = doc.xpath('./div')[2]

    ## get word
    word_spans = word_div.xpath('./span')
    word = clean_heading(word_spans[0])
    pronunciation = clean_html(word_spans[1])
    notes = clean_html(word_spans[2])
    word_variant = nil
    # e.g. front line /ˈˌfrənt ˈˌlīn / frontline
    # maybe there are cases when its not word variant
    if notes && !notes.include?('‹')
        word_variant = notes
        notes = nil

        words[word_variant] ||= []
        words[word_variant].push(word)
    end

    unless description_div
        puts "No description for #{word}, #{html}"
        return
    end

    ## get description
    description_parts = description_div.xpath('./blockquote')
    # можно по количеству blockquotes определить, есть ли номера
    with_numbers = description_parts[0].xpath("./span")[0]&.content == "I."
    word_description = {}

    # handle each part of speech
    description_parts.each do |description_part|
        block_spans = description_part.xpath("./span")
        if block_spans.count > 3
            raise "Too many block spans #{block_spans.count}, #{word}, #{block_spans.to_html}"
        end

        part_of_speech = with_numbers ? block_spans[1] : block_spans[0]
        part_of_speech_notes = clean_html(with_numbers ? block_spans[2] : block_spans[1])
        description_part_div = description_part.xpath("./div")[0]
        description = clean_html(description_part_div)
        # !description - e.g. Friesland
        # part_of_speech.length > 30 - in Rome there is description - but it's bugged structure, and there is alien div
        if !description || (part_of_speech && part_of_speech.content.length > 30)
            description = clean_html(part_of_speech) + description.to_s
            part_of_speech = 'definition'
        end
        part_of_speech = part_of_speech.is_a?(String) ? part_of_speech : clean_heading(part_of_speech)

        if part_of_speech == 'derivatives' 
            # TODO: handle derivatives if lemmatizer would be not enough
            next
        end

        if part_of_speech == 'symbol' 
            # dont handle symbols
            next
        end

        part_of_speech_hash = { description: description }
        part_of_speech_hash[:notes] = part_of_speech_notes if part_of_speech_notes
        # может быть несколько описаний для одной части речи, no obj и т.п.
        word_description[part_of_speech] ||= []
        word_description[part_of_speech] << part_of_speech_hash
    end


    ### get origin
    origin = nil
    if origin_div
        # remove '- origin'
        origin_div.xpath('./span').each do |span|
            if span.content.include?('– origin')
                span.remove
            end
        end
        origin = clean_html(origin_div)
    end

    word_hash = {
        word: word,
        description: word_description,
    }
    word_hash[:pronunciation] = pronunciation if pronunciation
    word_hash[:word_note] = notes if notes
    word_hash[:origin] = origin if origin

    words[word] ||= []
    words[word].push(word_hash)
end


(1..19).to_a.map do |i|
    puts "Processing file #{i}"
    str = `cat text#{format("%05d", i)}.html`
    arr = str.split("<hr/>"); arr.count

    # remove html wrapper
    arr[0].sub!("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\"><html xmlns=\"http://www.w3.org/1999/xhtml\">\r\n<head><title></title>\r\n</head>\r\n<body>\r\n", '')
    arr.pop

    words = {}
    # { word => [] | 'word_as_link' }

    arr.each.with_index do |html, i|
        if i % 500 == 0
            puts "Processing #{i} of #{arr.count} words"
        end
        begin
            process(html, words)
        rescue => e
            puts "Error on #{i} word, #{html}"
            raise e
        end
    end
    File.open("words#{i}.js", 'w') { |file| file.write("export default #{words.to_json}") }
    # File.open("words#{i}.js", 'w') { |file| file.write("export default #{JSON.pretty_generate(words)}") }
    
    puts "File written words#{i}.js"
end

puts "Finish"
