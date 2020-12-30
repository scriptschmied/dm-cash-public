let body = document.getElementsByTagName("body")[0]
body.style.margin = "0px 0px 0px 0px";

let iframe = document.getElementById("tdSecureIframe")
iframe.width = "600px";
iframe.height = "400px";
iframe.setAttribute("frameBorder", 0)
var url = window.location.search.substring(1);
iframe.src = url

iframe.onload = function(){
  iframe.onload = function(){
    window.top.postMessage('KILL_ME','*')
  }
}
