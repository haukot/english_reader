TODO:

* Мб на фронте сделать линку для копирования(для синка на новом устройстве)
Мож проще юзернейм вводить, и в папку юзера сохранять?.
* билд через CircleCI, грузить продовые докер контейнеры\композ, а не девовый
* дефолтный сервер flask'a сделан для dev нужд(может быть не быстр\секурен). В доке его советуют менять на waitress.



NOTES:

* browserlist version setted(in package.json) because of regeneratorRuntine error with parcel https://github.com/parcel-bundler/parcel/issues/2128
* htpasswd файл для nginx надо руками на сервере создавать
