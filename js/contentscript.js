// Create array for rendered URLs on the page
var renderedPreviews = []

// Reset badge icon
chrome.runtime.sendMessage({ method: 'resetIcon', key: '' })

// Allow background.js to check number of rendered previews
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.method == 'getPreviews') {
    sendResponse({ data: renderedPreviews.length.toString() })
  }
})

// Function for logging info
function log(string) {
  console.log("%c[Peek] " + string, "color: #4078c0")
}

// Prevent mixed protocol alerts in Chrome
function checkProtocol(url) {
  if (url.includes('https:')) {
    // HTTPS link on HTTP and HTTPS pages
    return true
  } else if (url.includes('http:') && window.location.protocol === 'http:') {
    // HTTP link on HTTP page
    return true
  } else {
    // Insecure mixed protocol
    return false
  }
}

// Find the full path of a given URL
function processURL(url) {
  // Regex to parse Internet Archive URLs: https://regex101.com/r/4F12w7/3
  var regex = /(?:web\.archive\.org\/web\/)(\d*)(\/)(.*)/
  if (url.includes('//web.archive.org/')) {
    // Get date
    var date = regex.exec(url)[1]
    // Get original URL
    var originalURL = regex.exec(url)[3]
    // Append '_id' to the end of the date, so the Internet Archive returns the original file and not an HTML file
    url = 'https://web.archive.org/web/' + date + 'id_/' + originalURL
  }
  var img = document.createElement('img')
  img.src = url
  url = img.src
  img.src = null
  // Don't continue if checkProtocol returns false
  if (checkProtocol(url)) {
    // Don't continue if the link already has a tooltip, or if the link is a page on Wikimedia
    if ((renderedPreviews.includes(url)) || (url.includes('commons.wikimedia.org/wiki/File:'))) {
      return null
    } else {
      renderedPreviews.push(url)
      chrome.runtime.sendMessage({ method: "changeIcon", key: renderedPreviews.length.toString() })
      return url
    }
  } else {
    log('Cannot generate a preview for ' + url + ' because it is not served over HTTPS.')
    return 'invalid'
  }
}

// Show preview for invalid URL/mixed content warning
function createErrorPreview(object) {
  tippy(object, {
    content: 'Peek cannot preview this link because it is served over an insecure connection.',
    arrow: true,
    delay: [500, 500]
  })
}

function previewVideo(object) {
  var url = DOMPurify.sanitize(object.getAttribute('href'))
  url = processURL(url)
  if (url === 'invalid') {
    // Show error message
    createErrorPreview(object)
  } else {
    log('Found video link: ' + url)
    // Create video player
    var player = '<video controls muted controlsList="nodownload nofullscreen noremoteplayback"><source src="' + url + '"></video>'
    // Create popup
    tippy(object, {
      content: player,
      interactive: true,
      arrow: true,
      theme: 'peek',
      delay: [500, 500],
      onShow: function(instance) {
        // Play the video after the popup appears
        videoEl = instance.popper.querySelector('video')
        videoEl.play()
      }
    })
  }
}

function previewAudio(object) {
  var url = DOMPurify.sanitize(object.getAttribute('href'))
  url = processURL(url)
  if (url === 'invalid') {
    // Show error message
    createErrorPreview(object)
  } else {
    log('Found audio link: ' + url)
    // Create audio player
    var player = '<audio controls controlsList="nodownload nofullscreen noremoteplayback"><source src="' + url + '"></video>'
    // Create popup
    tippy(object, {
      content: player,
      interactive: true,
      arrow: true,
      theme: 'peek',
      delay: [500, 500]
    })
  }
}

function previewDocument(object) {
  var url = DOMPurify.sanitize(object.getAttribute('href'))
  url = processURL(url)
  if (url === 'invalid') {
    // Show error message
    createErrorPreview(object)
  } else {
    log('Found document link: ' + url)
    // TODO
  }
}

function previewPDF(object) {
  var url = DOMPurify.sanitize(object.getAttribute('href'))
  url = processURL(url)
  if (url === 'invalid') {
    // Show error message
    createErrorPreview(object)
  } else {
    log('Found PDF link: ' + url)
    // Render the PDF with browser's own viewer
    var viewer = '<embed src="' + url + '#toolbar=0">'
    // Create popup
    tippy(object, {
      content: viewer,
      interactive: true,
      arrow: true,
      theme: 'peek',
      delay: [500, 500]
    })
  }
}

function previewGoogleDocs(object) {
  var url = DOMPurify.sanitize(object.getAttribute('href'))
  url = processURL(url)
  if (url === 'invalid') {
    // Show error message
    createErrorPreview(object)
  } else {
    log('Found Google Docs link: ' + url)
    // Find the file ID
    var docsid;
		if (url.indexOf("/edit") >= 0) {
			docsid = url.substring(url.lastIndexOf("/d/") + 3, url.lastIndexOf("/edit")); // Most Google Docs files
		} else if (url.indexOf("/open") >= 0) {
			docsid = url.substring(url.lastIndexOf("/open?id=") + 9); // Most Google Docs files
		} else if (url.indexOf("/preview") >= 0) {
			docsid = url.substring(url.lastIndexOf("/document/d/") + 12, url.lastIndexOf("/preview")); // Docs preview links
		} else if (url.indexOf("/viewer") >= 0) {
			docsid = url.substring(url.lastIndexOf("srcid=") + 6, url.lastIndexOf("&")); // Docs viewer links
		} else {
			docsid = url.substring(url.lastIndexOf("/d/") + 3, url.lastIndexOf("/viewform")); // Forms
    }
    // Render the popup
    if (docsid != 'ht') { // Fix for bug where Google search results would generate preview for mis-matched Docs link
			// Create embed
      var viewer = '<embed src="https://docs.google.com/viewer?srcid=' + docsid + '&pid=explorer&efh=false&a=v&chrome=false&embedded=true">'
      // Create popup
      tippy(object, {
        content: viewer,
        interactive: true,
        arrow: true,
        theme: 'peek',
        delay: [500, 500]
      })
		} else {
			renderedPreviews.splice(renderedPreviews.indexOf(url), 1)
			chrome.runtime.sendMessage({ method: 'changeIcon', key: renderedPreviews.length.toString() })
		}
  }
}

// Detect links for previews
function loadDOM() {

  // Video links
  var videoLinks = [
    'a[href$=".webm"]',
    'a[href$=".mp4"]',
    'a[href$=".m4v"]',
    'a[href$=".ogg"]',
    'a[href$=".ogv"]',
  ]

  // Audio links
  var audioLinks = [
    'a[href$=".mp3"]',
    'a[href$=".m4a"]',
    'a[href$=".oga"]',
    'a[href$=".wav"]',
  ]

  // Document links
  var docLinks = [
    'a[href$=".doc"]',
    'a[href$=".docx"]',
    'a[href$=".xls"]',
    'a[href$=".xlsx"]',
    'a[href$=".ppt"]',
    'a[href$=".pptx"]',
    'a[href$=".rtf"]',
  ]

  // PDF links
  var pdfLinks = ['a[href$=".pdf"]']

  // Google Docs links
  var googleLinks = ['a[href^="https://docs.google.com/d"],a[href^="https://drive.google.com/open"]']

  // Generate previews
  document.querySelectorAll(videoLinks.toString()).forEach(function (link) {
    previewVideo(link)
  })
  document.querySelectorAll(audioLinks.toString()).forEach(function (link) {
    previewAudio(link)
  })
  document.querySelectorAll(docLinks.toString()).forEach(function (link) {
    previewDocument(link)
  })
  document.querySelectorAll(pdfLinks.toString()).forEach(function (link) {
    previewPDF(link)
  })
  document.querySelectorAll(googleLinks.toString()).forEach(function (link) {
    previewGoogleDocs(link)
  })

}

// Initialize Peek on page load
loadDOM()