// Read settings from storage
chrome.storage.sync.get({
  docViewer: 'google'
}, function (data) {
  document.querySelector('#docviewer input[value="' + data.docViewer + '"]').checked = true
})

// Save settings after any input change
document.querySelectorAll('input').forEach(function(el) {
  el.addEventListener('change', function() {
    chrome.storage.sync.set({
      docViewer: document.querySelector('#docviewer input:checked').value
    })
  })
})

// Show instructions for leaving a review based on the browser being used
var useragent = navigator.userAgent;

// Opera has to be checked before Chrome, because Opera has both "Chrome" and "OPR" in the user agent string
var review = document.querySelector('.review-info')
if (useragent.includes("OPR")) {
  review.innerHTML = 'Leaving a review on the <a href="https://addons.opera.com/en/extensions/details/peek/" target="_blank">Opera add-ons site</a> is also greatly appreciated!'
} else if (useragent.includes("Chrome")) {
  review.innerHTML = 'Leaving a review on the <a href="https://chrome.google.com/webstore/detail/peek/bfpogemllmpcpclnadighnpeeaegigjk" target="_blank">Chrome Web Store</a> is also greatly appreciated!'
}