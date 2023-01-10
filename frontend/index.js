import lemmatize from "wink-lemmatizer"
import Dexie from 'dexie';
import { setCORS } from "google-translate-api-browser"

const backendHost = location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin

let wordsDict = {}


window.addEventListener('load', function() {
  const scripts = document.querySelectorAll('.words_dict_data')
  for (let i = 0; i < scripts.length; i++) {
    const wordsObj = window[`wordsDict${i + 1}`]
    for (let key in wordsObj) {
      wordsDict[key] = wordsObj[key];
    }
    delete window[`wordsDict${i + 1}`]
  }
})


// setting up cors-anywhere server address
const translate = setCORS(`${backendHost}/api/v1/proxy/`)

let curSentenceEl = null
let curWordEl = null
let state = null
let db = null
const defaultBook = {
  id: 'default_book.txt.000kinda000sha000',
  pages: [[0, 812]],
  name: "Default book",
  text: "Default Book. \n <span class=\"sentence\">The Eye of the World is the <span t=\"j\">best</span> of its <span t=\"n\">genre</span>.\n\n</span><span class=\"sentence\"></span><span class=\"sentence\">The Ottawa Citizen\n\n\n\n<span t=\"j\">splendid</span> <span t=\"n\">tale</span> of <span t=\"j\">heroic</span> <span t=\"n\">fantasy</span>, <span t=\"j\">vast</span> in <span t=\"n\">scope</span>, <span t=\"j\">colorful</span> in <span t=\"n\">detail</span>, and <span t=\"j\">convincing</span> in its <span t=\"n\">presentation</span> of <span t=\"j\">human</span> <span t=\"n\">character</span> and <span t=\"n\">personality</span>.I'm <span t=\"v\">living</span>\n\nL. Sprague De Camp\n</span>",
  currentPage: 1
}
let currentBook = defaultBook
const defaultState = {
  id: 1,
  words: {},
  currentBookId: defaultBook.id,
  // TODO: do i need pages here?
  books: [
    {
      id: 'default_book.txt.000kinda000sha000',
      pages: [[0, 612]],
      name: "Default book",
      currentPage: 1
    }
  ]
}

function handleError(err) {
  console.error(err, console.trace())
  alert(err)
}

// Offline page
if ('serviceWorker' in navigator) {
  const url = new URL('sw.js', import.meta.url);
  navigator.serviceWorker.register(url)
  .then((reg) => {
    console.log('Service worker registration succeeded. Scope is ' + reg.scope);
  }).catch((error) => {
    console.log('Service worker registration failed with ' + error);
  })
}

async function setupState() {
  db = new Dexie("store")
  db.version(4).stores({ state: "id", books: "id" })

  const stateRes = await db.state.where({ id: 1 }).toArray().catch(handleError)
  await updateState(stateRes[0] || defaultState)
}

function updateState(newState) {
  state = newState

  return (async function() {
    try {
      await db.state.put(state)

      if (state.currentBookId !== currentBook.id) {
        const bookRes = await db.books.where({ id: state.currentBookId }).toArray()
        if (bookRes[0]) {
          currentBook = bookRes[0]
        } else {
          handleError(`Cant load book ${state.currentBookId}, res is ${bookRes}; set to default book`)
          currentBook = defaultBook
        }
      }
    } catch(e) {
      handleError(e)
    }
  })()
}

async function addBook(book) {
  try {
    state.books.push({
      id: book.id,
      name: book.name,
      pages: book.pages,
      currentPage: 1
    })
    // insert in books with book.text
    await db.books.put(book)
    await updateState(state)
  } catch(e) {
    handleError(e)
  }
}

async function updateBook(bookId, data) {
  try {
    let book = state.books.find(b => b.id === bookId)
    if (!book) {
      handleError(`Book ${bookId} not found!`)
    }
    Object.assign(book, data)
    if (book.id === currentBook.id) {
      Object.assign(currentBook, data)
      // not await to get faster updates with pagination(dont wait for data to store)
      db.books.update(bookId, data).catch(handleError)
      updateState(state)
    } else {
      await db.books.update(bookId, data).catch(handleError)
      // will change currentBook in updateState
      await updateState(state)
    }
  } catch(e) {
    handleError(e)
  }
}

async function removeBook(bookId) {
  try {
    if (state.books.length === 1) return alert('Cant remove last book')
    await db.books.where({ id: bookId }).delete()

    state.books = state.books.filter(b => b.id !== bookId)
    if (bookId === currentBook.id) {
      state.currentBookId = state.books[0].id
    }

    await updateState(state)
  } catch(e) {
    handleError(e)
  }
}

function partOfSpeech(attr) {
  const parts = {
    n: 'noun',
    j: 'adjective',
    d: 'adverb',
    v: 'verb',
  }

  return parts[attr]
}

function lemma(attr, word) {
  const lemmFunc = partOfSpeech(attr)
  // dont have adverb lemmatization(maybe not even need it)
  return lemmatize[lemmFunc] ? lemmatize[lemmFunc](word) : word
}

function lookup(attr, word) {
  const wordsData = wordsDict[word]
  const lemmatized = lemma(attr, word)
  const lemmatizedWordData = wordsDict[lemmatized]
  const curPartOfSpeech = partOfSpeech(attr)

  let res = wordsData || lemmatizedWordData
  if (wordsData && lemmatizedWordData && lemmatized !== word) {
    res = wordsData.concat(lemmatizedWordData)
  }
  // string if it another variant of word, or(maybe in future?) deriviative
  if (res && typeof res === 'string') {
    wordsDict[res]
  }
  return res
}

function hide(el) {
  el.classList.add('hidden')
}

function show(el) {
  el.classList.remove('hidden')
}

function clearDict() {
  if (curWordEl) curWordEl.classList.remove('active')
  if (curSentenceEl) curSentenceEl.classList.remove('active')
  const dictCont = document.querySelector('.dictionary-container')
  hide(dictCont)
}

function showDict() {
  const dictCont = document.querySelector('.dictionary-container')

  const rect = curSentenceEl.getBoundingClientRect()
  dictCont.classList.remove('-top')
  dictCont.classList.remove('-bottom')
  if (rect.bottom > (window.innerHeight / 2)) {
    dictCont.classList.add('-top')
  } else {
    dictCont.classList.add('-bottom')
  }

  show(dictCont)
}

function renderTabBody (wordsData, wordIndex, curPartOfSpeech, partOfSpeechIndex) {
  if (!wordsData) return

  const tabEls = document.querySelectorAll('.dict_tabs-header .tab')
  for (let i = 0; i < tabEls.length; i++) {
    tabEls[i].classList.remove('active')
  }

  const wordIndexSelector = `[data-word-index="${wordIndex}"]`
  const partOfSpeechSelector = `[data-part-of-speech="${curPartOfSpeech}"]`
  const partOfSpeechIndexSelector = `[data-part-of-speech-index="${partOfSpeechIndex}"]`
  const tabEl = document.querySelector(`.dict_tabs-header .tab${wordIndexSelector}${partOfSpeechSelector}${partOfSpeechIndexSelector}`)
  if (tabEl) {
    // такого не должно быть, но бывает - и лучше что-то показать, чем даже попап не показывать
    tabEl.classList.add('active')
  }

  const wordData = wordsData[wordIndex]
  // TODO: move <p> of origin to parser script(convert_epub_to_json.rb)?
  let description = curPartOfSpeech === 'origin'
    ? `<p>${wordData.origin}</p>`
    : wordData.description[curPartOfSpeech] && wordData.description[curPartOfSpeech][partOfSpeechIndex].description

  if (wordData.word_note) {
    description = `${wordData.word_note}<br/>${description}`
  }

  if (wordData.description[curPartOfSpeech] && wordData.description[curPartOfSpeech].notes) {
    description = `${wordData.description[curPartOfSpeech].notes}<br/>${description}`
  }

  const tabBody = document.querySelector('.dict_tabs-body')
  tabBody.innerHTML = description

  if (wordData.pronunciation) {
    const tabPronunciation = document.querySelector('.dict_word_pronunciation')
    tabPronunciation.innerHTML = wordData.pronunciation
  }

  const tabName = document.querySelector('.dict_word_name')
  tabName.innerHTML = wordData.word
}

function getTabsHeaderHtml(wordsData) {
  if (!wordsData) return ''

  const hasNumber = wordsData.length > 1

  const tabsContent = wordsData.map((wordData, i) => {
    const renderTabHeader = (name, curPartOfSpeech, partOfSpeechIndex, wordIndex) => {
      return `<a class="tab" data-word-index="${wordIndex}" data-part-of-speech="${curPartOfSpeech}" data-part-of-speech-index="${partOfSpeechIndex}">${name}</a>`
    }
    const tabHeaders = Object.keys(wordData.description)
      .map((name) => {
        return wordData.description[name].map((_, pI) => {
          return renderTabHeader(name, name, pI, i)
        })
      }).flat()
    if (wordData.origin) tabHeaders.push(renderTabHeader('origin', 'origin', 0, i))

    let res = tabHeaders.join('&nbsp;|&nbsp;')
    if (hasNumber) {
      res = `<span class="word-number">${i + 1}.&nbsp;</span>${res}`
    }
    return `<div class="tabs-line">${res}</div>`
  }).join('')
  const tabs = "<div class='dict_tabs'><div class='dict_tabs-header'>" + tabsContent + "</div><div class='dict_tabs-body'></div></div>"
  return tabs
}

function renderText() {
  const textEl = document.querySelector('.text')
  const book = currentBook
  const curPage = book.currentPage
  const pages = book.pages
  const text = book.text
        .slice(pages[curPage - 1][0], pages[curPage - 1][1])
        .replace(/^\n+/, "") // remove leading \n's
  textEl.innerHTML = text

  // process spans
  let elements = document.querySelectorAll('.text span:not(.sentence)')
  let dict = document.querySelector('.dictionary')
  let rememberBtn = document.querySelector('button.remember')

  let myFunction = function() {
    clearDict()

    curWordEl = this
    const newSentenceEl = this.closest('.sentence')
    if (curSentenceEl !== newSentenceEl) {
      // прячем перевод, если другое предложение выделили.
      const translationEl = document.querySelector('.translation')
      translationEl.innerHTML = ''
      hide(translationEl)
    }

    curSentenceEl = newSentenceEl
    curWordEl.classList.add('active')
    curSentenceEl.classList.add('active')

    let word = this.innerHTML.toLocaleLowerCase('en')

    let attribute = this.getAttribute("t")
    const wordsData = lookup(attribute, word)

    const tabs = getTabsHeaderHtml(wordsData)
    const header  = `<b><span class="dict_word_name">${word}</span> <span class="dict_word_pronunciation"></span></b>&nbsp;&nbsp;<button class="sound"> &nbsp; </button>`
    dict.innerHTML = `${header} ${tabs}`
    renderSound()

    // иногда слово не находится и рендерить нечего. e.g. sharpshooting
    if (wordsData) {
      // can be definition, abbreviation, etc
      const curPartOfSpeech = partOfSpeech(attribute) || Object.keys(wordsData[0].description)[0]
      let wordIndex = wordsData.findIndex((wordData) => {
        return Object.keys(wordData.description).includes(curPartOfSpeech)
      })
      if (wordIndex === -1) wordIndex = 0
      renderTabBody(wordsData, wordIndex, curPartOfSpeech, 0)

      // event listener for tabs
      let tabEls = document.querySelectorAll('.dict_tabs-header .tab')
      for (let i = 0; i < tabEls.length; i++) {
        tabEls[i].addEventListener('click', () => {
          const tab = tabEls[i]
          const wordIndex = tab.getAttribute('data-word-index')
          const curPartOfSpeech = tab.getAttribute('data-part-of-speech')
          const partOfSpeechIndex = parseInt(tab.getAttribute('data-part-of-speech-index'), 10)

          renderTabBody(wordsData, wordIndex, curPartOfSpeech, partOfSpeechIndex)
        }, false)
      }
    }

    showDict()
  }

  for (let i = 0; i < elements.length; i++) {
    if (state.words[elements[i].innerHTML]) {
      elements[i].classList.add('remembered')
    }
    elements[i].addEventListener('click', myFunction, false)
  }

  // to drop selection
  document.addEventListener('click', ({ target }) => {
    if (!target.closest('.text span, .dictionary-container')) {
      clearDict()
    }
  })
}

function renderTranslation() {
  let btn = document.querySelector('button.translate')
  let el = document.querySelector('.translation')

  let myFunction = function() {
    btn.classList.add('-process')
    translate(curSentenceEl.innerText, { from: "en", to: "ru" })
      .then(res => {
        el.innerHTML = res.text
        show(el)
        btn.classList.remove('-process')
      })
      .catch(handleError)
  }
  btn.addEventListener('click', myFunction, false)
}

function renderRemember() {
  let btn = document.querySelector('button.remember')
  let dict = document.querySelector('.dictionary')

  let myFunction = function() {
    state.words[curWordEl.innerHTML] = true
    updateState(state)
    curWordEl.classList.add('remembered')

    btn.classList.add('-success')
    setTimeout(() => btn.classList.remove('-success'), 500)
  }
  btn.addEventListener('click', myFunction, false)
}

function renderSound() {
  let btn = document.querySelector('button.sound')

  let myFunction = function() {
    // const word = document.querySelector('.dict_word_name').innerHTML.toLowerCase()
    const word = curWordEl.innerHTML.toLowerCase()
    const player = new Audio(`https://voice.reverso.net/RestPronunciation.svc/v1/output=json/GetVoiceStream/voiceName=Heather22k?mp3BitRate=64&inputText=${btoa(word)}`)
    player.play()
  }
  btn.addEventListener('click', myFunction, false)
}

function renderMenu() {
  const btn = document.querySelector('.menu-button')
  const menuCont = document.querySelector('.menu-container')
  const bookCont = document.querySelector('.book-container')

  let myFunction = function() {
    if (menuCont.classList.contains('hidden')) {
      show(menuCont)
      hide(bookCont)
    } else {
      hide(menuCont)
      show(bookCont)
    }
  }
  btn.addEventListener('click', myFunction, false)
}

function renderRemoveBook() {
  const btns = document.querySelectorAll('.book-delete')

  let myFunction = function() {
    const id = this.getAttribute('data-bookid')
    removeBook(id).then(renderBookshelf)
  }

  for (let i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', myFunction, false)
  }
}

function renderOpenBook() {
  const btns = document.querySelectorAll('.book-open')
  const menuBtn = document.querySelector('.menu-button')

  let myFunction = function() {
    menuBtn.click() // to hide menu
  }

  for (let i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', myFunction, false)
  }
}

function renderBookshelf() {
  const books = document.querySelector('.books')

  const template = function({ idx, id, currentPage, name }) {
    return `
      <div class="book">
        ${idx + 1}. <a class="book-open" href="#book=${id}&page=${currentPage}"> ${name} </a>
        <button class="book-delete" data-bookid=${id}> 	&#128465; </button>
      </div>`
  }

  const html = state.books.map((book, i) => {
    return template({ idx: i, id: book.id, name: book.name, currentPage: book.currentPage })
  }).join("\n")

  books.innerHTML = html

  renderRemoveBook()
  renderOpenBook()
}

async function renderPagination() {
  // insert book
  const div = document.querySelector('.pagination')
  let curPage
  let curBook

  const params = window.location.hash.split('&')
  if (params.length === 2
      && params[0].split('=')[0] === '#book'
      && params[1].split('=')[0] === 'page') {
    curBook = params[0].split('=')[1]
    curPage = parseInt(params[1].split('=')[1]) || 1
    if (!state.books.find(b => b.id === curBook)) {
      handleError(`Trying to sync book because it's not found. Book: ${curBook}`)
      await syncBook(curBook)
    }
    state.currentBookId = curBook
  } else {
    curBook = state.currentBookId
    curPage = state.books.find(b => b.id === curBook).currentPage
  }
  await updateBook(curBook, { currentPage: curPage })

  const pages = currentBook.pages

  const renderBtn = (page, text=page) => {
    return `<a class="page-btn ${curPage === page && 'active'}" href="#book=${state.currentBookId}&page=${page}">${ text }</a>`
  }

  const pageBtns = [renderBtn(1)]
  if (curPage > 2) pageBtns.push(renderBtn(curPage - 1, '<&nbsp;Prev'))
  if (curPage > 1) pageBtns.push(renderBtn(curPage))
  if (pages.length > curPage + 1) pageBtns.push(renderBtn(curPage + 1, 'Next&nbsp;>'))
  if (pages.length > curPage) pageBtns.push(renderBtn(pages.length))

  const pagesHTML = pageBtns.join('&nbsp')

  div.innerHTML = pagesHTML
}

function handleRoutingChange() {
  window.addEventListener('hashchange', function() {
    renderPagination().then(() => {
      window.scrollTo(0, 0)
      renderText()
    })
  })
}

async function afterBookUpload(book) {
  await addBook(book)
  renderBookshelf()
}

async function syncBook(id) {
  try {
    const response = await fetch(`${backendHost}/api/v1/sync?id=${id}`, {
      method: 'GET'
    }).then(response => response.json())

    await afterBookUpload(response)
    alert('File successfully synced')
  } catch(e) { handleError(e) }
}

function renderUpload() {
  const btn = document.querySelector('button.upload')

  let myFunction = function() {
    const fileInput = document.querySelector('#input-file')
    const file = fileInput.files[0]
    const formData = new FormData()
    formData.append('file', file)
    btn.classList.add('-process')

    const name = file.name

    fetch(`${backendHost}/api/v1/process`, {
      method: 'POST',
      body: formData
    }).then(response => response.json())
      .then(response => {
        btn.classList.remove('-process')
        afterBookUpload(response)
      })
      .catch(handleError)
  }
  btn.addEventListener('click', myFunction, false)
}

document.addEventListener("DOMContentLoaded", async function(event) {
  await setupState()

  renderMenu()
  await renderPagination()
  renderText()
  renderTranslation()
  renderRemember()
  renderUpload()
  renderBookshelf()
  handleRoutingChange()
})
