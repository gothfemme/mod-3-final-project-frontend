document.addEventListener("DOMContentLoaded", () => {
  let webSocket;
  let channelId;
  let currentUser;
  const container = document.querySelector('#container')
  let hostPingInterval;
  let hostMode = false;
  let toggleEvent = false


  function identifier(channelId) {
    return `{\"channel\":\"VideosChannel\",\"id\":\"${channelId}\",\"userid\":\"${currentUser.id}\"}`
  }

  function showUserSignIn() {
    const about = showAbout()
    const div = document.createElement('div')
    div.className = 'card'
    const form = document.createElement('form')
    form.className = 'card-footer'
    form.innerHTML = `
            <label for="username-input">Display Name:</label>
    <div class="input-group">
        <input type="text" name="username" id="username-input" class="form-control form-control-lg" placeholder="Enter a name...">
      <div class = "input-group-append">
        <input type="submit" class="btn btn-success" value="Login">
      </div>
    </div>`
    form.addEventListener('submit', handleSignIn)
    div.append(form)
    container.append(about, div)
  }

  function showAbout() {
    const div = document.createElement('div')
    div.class = "jumbotron"
    div.innerHTML = `<div class="jumbotron">
  <h2 class="display-4">What's tübular?</h1>
  <p class="lead">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
  <p>Elementum curabitur vitae nunc sed velit dignissim sodales. Cursus euismod quis viverra nibh cras pulvinar mattis. A diam sollicitudin tempor id. Facilisi cras fermentum odio eu feugiat pretium. Viverra nam libero justo laoreet sit amet. A cras semper auctor neque vitae tempus quam. Eu scelerisque felis imperdiet proin. Scelerisque viverra mauris in aliquam sem fringilla ut morbi tincidunt. Proin sed libero enim sed faucibus turpis. Tincidunt vitae semper quis lectus nulla at volutpat. Ut enim blandit volutpat maecenas volutpat blandit aliquam etiam. Sit amet dictum sit amet justo donec. At tellus at urna condimentum mattis pellentesque id nibh tortor. Orci nulla pellentesque dignissim enim sit amet. Porta lorem mollis aliquam ut.</p>
`
    // form.addEventListener('submit', handleSignIn)
    return div
  }

  function handleSignIn(e) {
    e.preventDefault()
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: e.target.username.value
      })
    }
    fetch('http://localhost:3000/users', options)
      .then(r => r.json())
      .then(user => {
        currentUser = { ...user }
      })
      .then(getChannelList)
      .then(() => webSocket = openConnection())
  }

  function displayAddForm() {
    const div = document.querySelector('#add-video-container')
    const form = document.createElement('form')
    form.id = 'add-video-form'
    // form.className = 'form-inline'
    form.innerHTML = `<div class = "input-group"><input type = "text"name = "textform"class = "form-control"placeholder = "YouTube Video ID..." autocomplete = "off"><div class = "input-group-append"><input type="submit"value = "Add Video To Playlist"class = "btn btn-success"></div></div>`
    form.addEventListener('submit', addVideoHandler)
    div.append(form)
  }

  function getChannelList() {
    container.innerHTML = ''
    const card = document.createElement('div')
    card.className = 'card'
    document.querySelector('#page-name')
      .innerHTML = "<h2>Channels</h2>"
    card.append(displayNewChannelForm())
    const ul = document.createElement('ul')
    ul.id = 'channel-list'
    ul.className = 'list-group list-group-flush'
    fetch('http://localhost:3000/channels')
      .then(r => r.json())
      .then(channels => channels.forEach(channel => ul.append(displayChannel(channel))))
    card.append(ul)
    container.append(card)
  }

  function displayChannel(channel) {
    const li = document.createElement('li')
    li.innerHTML = `${channel.name} <span>${channel.view_count} Viewer${parseInt(channel.view_count) > 1 || parseInt(channel.view_count) === 0 ? 's' : ''}</span>`
    li.className = 'list-group-item'
    li.dataset.id = channel.id
    li.addEventListener('click', e => showChannelPage(e.target.dataset.id))
    return li
  }

  function displayNewChannelForm() {
    const wrapper = document.createElement('div')
    wrapper.className = 'card-header'
    const showForm = document.createElement('div')
    showForm.innerText = '+ New Channel'
    const form = document.createElement('form')
    // form.className = 'form-inline'
    form.innerHTML = `<div class="input-group"><input type = "text" name="channelname" class="form-control" placeholder="Channel name..." autocomplete="off"><div class="input-group-append"><input type="submit" value="Create Channel" class="btn btn-success"></div></div>`
    form.addEventListener('submit', handleNewChannel)
    form.hidden = true
    showForm.addEventListener('click', () => form.hidden === true ? form.hidden = false : form.hidden = true)
    wrapper.append(showForm, form)
    return wrapper
  }

  function handleNewChannel(e) {
    e.preventDefault()
    //post
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: e.target.channelname.value,
        time: 0,
        state: 0,
        playlist_index: 0
      })
    }
    fetch('http://localhost:3000/channels', options)
      .then(r => r.json())
      .then(channel => showChannelPage(channel.id))
  }

  function addVideoHandler(e) {
    e.preventDefault()
    let options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: e.target.textform.value,
        user_id: currentUser.id,
        channel_id: channelId
      })
    }
    fetch('http://localhost:3000/videos', options)
      .then(r => r.json())
      .then(json => {
        sendAddedPlaylist()
      })

    e.target.textform.value = ''
  }

  function showChannelPage(id) {
    container.innerHTML = ''
    document.querySelector('iframe')
      .hidden = false
    channelId = parseInt(id)
    joinChannel()
  }

  function showViewCount(channel) {
    let view_count = parseInt(channel.view_count) + 1
    const div = document.querySelector('#chat-container')
    const viewCount = document.createElement('div')
    viewCount.id = 'view_count'
    viewCount.className = 'card-header'
    viewCount.innerText = `${view_count} Viewer${(view_count > 1 || view_count === 0) ? 's' : ''}`
    const message = {
      "command": "message",
      "identifier": identifier(channelId),
      "data": `{\"view_count\": \"${view_count}\"}`
    }
    webSocket.send(JSON.stringify(message))
    div.append(viewCount)
  }

  // function updateChannelSync() {
  //   const options = {
  //     method: "PATCH",
  //     headers: {
  //       "Content-Type": "application/json"
  //     },
  //     body: JSON.stringify({
  //       time: window.player.getCurrentTime()
  //     })
  //   }
  //   return fetch(`
  http: //localhost:3000/channels/${channelId}`, options)
    // }

    function sendAddedPlaylist() {
      const message = {
        "command": "message",
        "identifier": identifier(channelId),
        "data": `{\"action\": \"add_video\",\"time\": \"${window.player.getCurrentTime()}\"}`
      }
      webSocket.send(JSON.stringify(message))
    }

  function showBackButton() {
    const button = document.createElement('button')
    button.id = 'back-button'
    // button.innerText = 'Leave Channel'
    button.innerHTML = `<i class="fas fa-angle-left"></i>`
    button.className = "btn btn-outline-dark border-0"
    button.addEventListener('click', () => {
      toggleEvent = false
      if (hostMode) {
        hostMode = false
        clearInterval(hostPingInterval)
      }
      const unsubscribeMsg = {
        "command": "unsubscribe",
        "identifier": identifier(channelId)
      }
      console.log('unsubscribed')
      webSocket.send(JSON.stringify(unsubscribeMsg))
      window.player.stopVideo()
      hidePartyMode()
      toggleChannelPage(true)
      channelId = null
      document.querySelector('iframe')
        .hidden = true

      getChannelList()
    })
    return button
  }

  function joinChannel() {
    toggleChannelPage(false)
    displayAddForm()
    fetch(`http://localhost:3000/channels/${channelId}`)
      .then(r => r.json())
      .then(json => {
        const pageName = document.querySelector('#page-name')
        pageName.innerHTML = ''
        const h2 = document.createElement('h2')
        h2.append(showBackButton(), json.name)
        pageName.append(h2, toggleHostingBadge())
        showViewCount(json)
        showMessageHistory(json.messages)
        videoInitOnJoin(json)
      })

    const subscribeMsg = {
      "command": "subscribe",
      "identifier": identifier(channelId)
    }
    webSocket.send(JSON.stringify(subscribeMsg))
    socketListenerInit(webSocket)
  }

  function toggleHostingBadge() {
    if (hostMode) {
      const head = document.querySelector('#page-name')
      const span = document.createElement('span')
      span.className = "badge badge-pill badge-primary"
      span.innerHTML = '<i class="fas fa-crown"></i> Hosting'
      // span.hidden = true
      return span
    } else {
      return ''
    }
  }

  function openConnection() {
    console.log('creating connection')
    return new WebSocket("ws://localhost:3000/cable")
  }

  function initVideo() {
    const youtubeScriptId = 'youtube-api';
    const youtubeScript = document.getElementById(youtubeScriptId);
    const video = document.querySelector('#player')

    if (youtubeScript === null) {
      const tag = document.createElement('script');
      const firstScript = document.getElementsByTagName('script')[0];

      tag.src = 'https://www.youtube.com/iframe_api';
      tag.id = youtubeScriptId;
      firstScript.parentNode.insertBefore(tag, firstScript);
    }

    window.onYouTubeIframeAPIReady = function() {
      window.player = new window.YT.Player(video, {
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0
        },
        width: '100%',
        height: '100%',
        events: {
          'onStateChange': onPlayerStateChange
        }
      });
      document.querySelector('iframe')
        .hidden = true
    }
  }

  function onPlayerStateChange(event) {
    if (toggleEvent) {
      const message = {
        "command": "message",
        "identifier": identifier(channelId),
        "data": `{\"action\": \"sync_videos\",
            \"time\": \"${event.target.j.currentTime}\",
            \"playlist_index\": \"${event.target.j.playlistIndex}\",
            \"state\": \"${event.data}\"}`
      }
      webSocket.send(JSON.stringify(message))
    }
  }

  function socketListenerInit(webSocket) {
    webSocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.message === "YOU'RE THE HOST") {
        toggleHostMode()
      }
      if (data.message === "The host has left.") {
        findNewHost()
      }
      try {
        if (!!data.message["view_count"]) {
          // console.log(data.message["view_count"])
          let viewCount = document.querySelector('#view_count')
          let view_count = parseInt(data.message["view_count"])
          viewCount.innerText = `${view_count} Viewer${(view_count > 1 || view_count === 0) ? 's' : ''}`
        }
        if (data.message["party_mode"] === "true" && !hostMode) {
          toggleEvent = true
          webSocket.send(JSON.stringify(message))
        }
        if (data.message["party_mode"] === "false" && !hostMode) {
          toggleEvent = false
        }
        if (data.message.action === "sync_videos") {
          videoSyncControl(data.message)
          if (hostMode) {
            clearInterval(hostPingInterval)
            hostPingInterval = setInterval(hostPing, 5000)
          }
        }
        if (data.message.action === "add_video") {
          fetch(`http://localhost:3000/channels/${channelId}`)
            .then(r => r.json())
            .then(e => videoInitOnJoin(e, parseInt(data.message.time)))
          if (hostMode) {
            clearInterval(hostPingInterval)
            hostPingInterval = setInterval(hostPing, 5000)
          }
        }
        if (data.message.action === "send_message") {
          const ul = document.querySelector('#chat')
          const li = document.createElement('li')
          li.className = 'list-group-item'
          li.innerHTML = `<span class="message-username">${data.message.username}</span>: ${data.message.content}`
          ul.append(li)
          ul.scrollTop = ul.scrollHeight
        }
      } catch (error) {
        ':^)'
      }
    }
  }

  function findNewHost() {
    const message = {
      "command": "message",
      "identifier": identifier(channelId),
      "data": `{\"action\": \"delegate_host\"}`
    }
    webSocket.send(JSON.stringify(message))
  }

  function hostPing() {
    console.log('pinging as host')
    const message = {
      "command": "message",
      "identifier": identifier(channelId),
      "data": `{\"action\": \"sync_videos\",
          \"time\": \"${window.player.j.currentTime}\",
          \"playlist_index\": \"${window.player.j.playlistIndex}\",
          \"state\": \"${window.player.j.playerState}\"}`
    }
    webSocket.send(JSON.stringify(message))
  }

  function toggleHostMode() {
    hostPingInterval = setInterval(hostPing, 5000)
    hostMode = true
    toggleEvent = true
    const row = document.querySelectorAll('.row')[1]
    row.append(showPartyModeButton())
  }

  // Message stuff

  function showMessageHistory(messages) {
    const div = document.querySelector('#chat-container')
    const ul = document.createElement('ul')
    ul.id = 'chat'
    ul.className = 'list-group list-group-flush'
    messages.forEach(message => {
      const li = document.createElement('li')
      li.className = 'list-group-item'
      li.innerHTML = `<span class="message-username">${message.username}</span>: ${message.content}`
      ul.append(li)
    })
    div.append(ul, showMessageForm())
    ul.scrollTop = ul.scrollHeight
  }

  function showMessageForm() {
    const form = document.createElement('form')
    form.id = 'message-form'
    form.className = 'card-footer pb-1 pt-1'
    form.innerHTML = `
    <div class="input-group">
    <input type="text" name="message" class="form-control" placeholder="Send a message..." autocomplete="off">
      <div class="input-group-append">
    <input type="submit" value="Send" class="btn btn-success">
    </div>
    </div>
    `
    form.addEventListener('submit', handleMessageSubmit)
    return form
  }

  function handleMessageSubmit(e) {
    e.preventDefault()

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: e.target.message.value,
        channel_id: channelId,
        user_id: currentUser.id
      })
    }
    fetch('http://localhost:3000/messages', options)
    const message = {
      "command": "message",
      "identifier": identifier(channelId),
      "data": `{\"action\": \"send_message\",
          \"content\": \"${e.target.message.value}\",
          \"username\": \"${currentUser.username}\"}`
    }
    webSocket.send(JSON.stringify(message))


    e.target.message.value = ''
  }

  function toggleChannelPage(bool) {
    const channel = document.querySelector('#channel-container')
    channel.hidden = bool
    const chat = document.querySelector('#chat-container')
    chat.innerHTML = ''
    const add = document.querySelector('#add-video-container')
    add.innerHTML = ''
  }

  function videoInitOnJoin(data, time) {
    let playlistArr = data.videos.map(obj => obj.url)
    window.player.loadPlaylist(playlistArr, parseInt(data.playlist_index), time ? time : parseInt(data.time))
  }

  function showPartyModeButton() {
    const div = document.createElement('div')
    div.className = "col-md-4 text-center"
    div.id = 'party-container'
    const button = document.createElement('button')
    button.id = 'party-mode'
    button.className = 'btn btn-danger'
    button.innerHTML = '<i class="fas fa-users"></i> Switch to Party Mode'
    button.addEventListener('click', () => {
      if (button.classList.toggle("party-hard")) {
        button.innerHTML = '<i class="fas fa-user"></i> Switch to Host Mode'
        startTheParty()
      } else {
        button.innerHTML = '<i class="fas fa-users"></i> Switch to Party Mode'
        endTheParty()
      }
    })
    div.append(button)
    return div
  }

  function hidePartyMode() {
    document.querySelector('#party-container')
      .remove()
  }

  function startTheParty() {
    const message = {
      "command": "message",
      "identifier": identifier(channelId),
      "data": `{\"party_mode\": \"true\"}`
    }
    webSocket.send(JSON.stringify(message))
  }

  function endTheParty() {
    const message = {
      "command": "message",
      "identifier": identifier(channelId),
      "data": `{\"party_mode\": \"false\"}`
    }
    webSocket.send(JSON.stringify(message))
  }

  // getChannelList()
  toggleChannelPage(true)
  showUserSignIn()
  initVideo()
})



function videoSyncControl(data) {
  if (window.player.getPlaylistIndex() !== parseInt(data.playlist_index)) {
    player.playVideoAt(parseInt(data.playlist_index))
  }
  if (Math.abs(window.player.getCurrentTime() - parseInt(data.time)) > 1) {
    window.player.seekTo(parseInt(data.time))
  }
  switch (data.state) {
    case "1":
      window.player.playVideo()
      break;
    case "2":
      window.player.pauseVideo()
      break;
  }
}

function loadVideo(videoId) {
  window.player.loadVideoById(videoId)
}