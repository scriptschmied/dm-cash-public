function fetchResource(input, init) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({input, init}, messageResponse => {
        const [response, error] = messageResponse;
        if (response === null) {
          reject(error);
        } else {
          // Use undefined on a 204 - No Content
          const body = response.body ? new Blob([response.body]) : undefined;
          resolve(new Response(body, {
            status: response.status,
            statusText: response.statusText,
          }));
        }
      });
    });
  }

var indexHtmlInsert = document.createElement("div");
indexHtmlInsert.innerHTML = `
<style>
  #dm-cash-panel {
    position : fixed;
    right : 10px;
    bottom : 10px;
    height : 240px;
    width : 460px;
    overflow : hidden;
    z-index : 2147483600;
    border-style : solid;
    border-width : 1px;
    border-radius : 5px;
    box-sizing : border-box;
  }
  .dm-cash-iframe {
    box-sizing : border-box;
    height: 225px;
    width : 100%;
    background : white;
  }
  .dm-cash-header {
    margin : 0px 0px 0px 0px;
    width : 100%;
    height : 15px;
    font-family : arial;
    background-color : #F05E23;
    display : flex;
    justify-content : flex-end;
    align-items : center;
    color : grey;
    padding-top : 4px;
    padding-right : 4px;
    box-sizing : border-box;
  }

  .pointer {
    cursor : pointer;
    box-sizing : border-box;
    font-size : 12px;
  }
  .dm-cash-panel {
    overflow: scroll;
    overflow-x: hidden;
  }
  div.dm-cash-panel ::-webkit-scrollbar {
    width: 0px;  /* Remove scrollbar space */
  }

  .small-padding-right {
    padding-right : 0.5em;
  }
</style>
<div id="dm-cash-panel">
    <div class="dm-cash-header">
      <div id="log-out-link" class="pointer small-padding-right">Log Out</div>
      <div id="exit-session-link" class="pointer">Exit Session</div>
    </div>
</div>`

var docBody = document.getElementsByTagName('body')
var doc = document;

console.log(docBody);

var globalP = new Promise(function(resolve, reject){
    chrome.storage.local.get("loginToken", function(loginToken){
      console.log('AA');
      if (loginToken.exp < (Date.now()/1000)){
        console.log('D');
        reject();
      }
      if (!loginToken["loginToken"] || !loginToken["loginToken"]["customerId"]){
        console.log('F');
        reject()
      }
      else {
        resolve(loginToken)
      }
    })
  })
.then(function(loginToken){
  return fetchResource("https://prologos.cc/v1/customers/data", {
    method : 'POST',
    headers : {
      'Content-Type' : 'application/json'
    },
    body : JSON.stringify({
      cust : loginToken["loginToken"]["customerId"],
      tokenId : loginToken["loginToken"]["tokenId"]
    })
  })
})
.then(function(result){
  return result.json()
})
.then(function(json){
  console.log(JSON.stringify(json))
  return new Promise(function(resolve,reject){chrome.storage.local.set({initState : json[0]["appState"]}, function(){
    console.log(docBody,2);
    docBody[0].appendChild(indexHtmlInsert);
    resolve();
  })});
})
.catch(function(){
  return new Promise(function(resolve,reject){chrome.storage.local.set({initState : "login_needed"}, function(){
    console.log(docBody,2);
    docBody[0].appendChild(indexHtmlInsert);
    resolve();
  })});
})
.then(function(){

var extensionOrigin = 'chrome-extension://' + chrome.runtime.id;
var dmCashPanel = doc.getElementById("dm-cash-panel");
console.log(dmCashPanel);
if (!location.ancestorOrigins.contains(extensionOrigin)) {
    var iframeHtmlInsert = document.createElement('iframe');
    iframeHtmlInsert.src = chrome.runtime.getURL('iframe.html');
    iframeHtmlInsert.frameBorder = "0"
    iframeHtmlInsert.classList.add("dm-cash-iframe")
    dmCashPanel.appendChild(iframeHtmlInsert);
}

var exitSessionLink = document.getElementById("exit-session-link");

exitSessionLink.onclick = function(){
  dmCashPanel.parentNode.removeChild(dmCashPanel);
}

var logOutLink = document.getElementById("log-out-link");

logOutLink.onclick = function(){
  chrome.storage.local.set({"loginToken" : null}, function(){
    dmCashPanel.parentNode.removeChild(dmCashPanel);
  })
}

return
})
