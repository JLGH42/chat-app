const socket = io() //conection to server

//Elements
const $msgInput = document.querySelector('input')
const $msgForm = document.querySelector('form#msg')
const $msgButton = document.querySelector('#send-message')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')
const $sidebar = document.querySelector('#sidebar')

//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//Options
let { username, room } = Qs.parse(location.search.substr(1), { ignoreQueryPrefix: 'true' })

const autoscroll = () => {
    const $newMessage = $messages.lastElementChild
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parse.int(newMessageStyles.margin)
    const $newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    const visibleHeight = $messages.offsetHeight
    const containerHeight = $messages.scrollHeight

    const scrollOffset = $messages.scrollTop + $messages.visibleHeight

    if (containerHeight - $newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

$msgForm.addEventListener('submit', (e) => {
    e.preventDefault()
    $msgButton.setAttribute('disabled', 'disabled')

    socket.emit('sendMessage', e.target.elements.message.value, (error) => {
        $msgButton.removeAttribute('disabled')
        $msgInput.value = ''
        $msgInput.focus()

        if (error) {
            return console.log(error)
        }
        console.log('Message Delivered')
    })
})
socket.on('message', (msg) => {
    console.log(msg)
    const props = {
        username: msg.username,
        createdAt: moment(msg.createdAt).format('LT'),
        message: msg.text
    }
    const html = Mustache.render(messageTemplate, props)
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('userLocation', (location) => {
    const props = {
        username: location.username,
        location: location.url,
        createdAt: moment(location.createdAt).format('LT')
    }
    const html = Mustache.render(locationTemplate, props)
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {
    const props = { room, users }
    const html = Mustache.render(sidebarTemplate, props)
    $sidebar.innerHTML = html
})

let options = {
    timeout: 5000
}
let success = (pos) => {
    socket.emit('sendLocation', {
        lat: pos.coords.latitude,
        long: pos.coords.longitude
    }, () => {
        $sendLocationButton.removeAttribute('disabled')
        console.log('Location Shared!')
    })
}
let error = (err) => {
    console.log(err.code)
    return new Error('Error')
}

$sendLocationButton.addEventListener('click', async(e) => {
    if (!navigator.geolocation) {
        return alert('Your browser does not support this feature')
    }
    $sendLocationButton.setAttribute('disabled', 'disabled')
    await navigator.geolocation.getCurrentPosition(success, error, options)
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})