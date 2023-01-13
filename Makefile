# copy and run in the right directory
data:
	(cd raw_data/dir && rm words*.js && ruby ../../../convert_epub_to_json.rb)

.PHONY: data
