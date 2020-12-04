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
          statusText: response.statusText
        }));
      }
    });
  });
}
let getLoginToken = function(){
  return new Promise(function(resolve,reject){
    chrome.storage.local.get("loginToken", function(value){
      resolve(value)
    })
  })
}
var requireConfirmation = function(amt, curr, handle){
    let multiplier = 100
    if (curr === "JPY"){
      multiplier = 1
    }
    divAmt = (amt/multiplier).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")
    document.getElementById("tipContentBar").innerHTML = `
    <div>Click 'confirm' to certify that you are giving ${divAmt} ${curr} to ${handle}.</div>
    <button class="small-margin-left" id="confirmationButton">Confirm</button>`
    let confirmationButton = document.getElementById("confirmationButton");
    confirmationButton.onclick = function(){
    getLoginToken().then(function(loginToken){
      return fetchResource('https://prologos.cc/v1/customers/transactions', {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json'
        },
        body : JSON.stringify({
          cust : loginToken["loginToken"]["customerId"],
          loginToken : loginToken["loginToken"],
          transferTo : {
            platform : "kohlChan",
            handle : handle
          },
          amt : amt.toString()
        })
      })
    })
  .then(function(resp){
    if (!resp.ok){
      throw Error();
    }
    return resp.text();
  })
  .then(function(resp){
    if (resp === "OK"){
    console.log(resp,999);
    document.getElementById("tipContentBar").innerHTML = "Success!"
    tag.innerHTML = `${tag.innerHTML}+1`
    return
    }
    else {
      let tipContentBar = document.getElementById("tipContentBar")
      tipContentBar.innerHTML = "Your bank requires 3D Secure authentication. Please complete the following form."
      let tipBox = document.getElementById("tipBox")
      tipBox.style.width = "600px";
      var iframeHtmlInsert = document.createElement('iframe');
      window.addEventListener('message', event => {
        console.log(event.origin)
        if (event.origin.startsWith('chrome-extension://')){
          tipContentBar.innerHTML = "Success!"
          tag.innerHTML = `${tag.innerHTML}+1`
          iframeHtmlInsert.remove();
        }
      })
      iframeHtmlInsert.src = chrome.runtime.getURL(`tdsecure.html?${resp}`);
      iframeHtmlInsert.style.width = "600px";
      iframeHtmlInsert.style.height = "400px";
      iframeHtmlInsert.frameBorder = "0";
      tipBox.appendChild(iframeHtmlInsert);
    }
  })
  .catch(function(err){
    console.log(err);
    document.getElementById("tipContentBar").innerHTML = "Error occurred."
    return
  })
    }
}
fetchResource('https://prologos.cc/v1/rates/tip_suggestions')
.then(function(resp){
return resp.json();
}, function(err){
console.log(err);
})
.then(function(json){
let currCodeTipSuggestions = json
setTimeout(function(){
var tags = document.getElementsByClassName("labelSubject");
console.log(tags);
var tipexists = 0;
var tipBoxTimer
var randomNumber = function(){
  return Math.random();
}

var appendTipBox = function(x, y, handle, verified){
  if (tipexists === 1){
  let prevTipBox = document.getElementById("tipBox");
  prevTipBox.remove();
  }
  var tipBoxInsert = document.createElement("div");
  chrome.storage.local.get("walletCurrency", function(curr){
  console.log(curr["walletCurrency"]);
  curr = curr["walletCurrency"];
  let tipSuggestionArr = currCodeTipSuggestions["USD" + curr];
  let multiplier
  if (curr === "JPY" || curr === "jpy"){
    multiplier = 1;
  }
  else {
    multiplier = 100;
  }
  tipBoxInsert.innerHTML = `
  <style>
  @font-face {
    font-family: arimo;
    src: url(resources/Arimo-Regular.ttf);
  }
  #tipBox {
    position : absolute;
    left : ${x}px;
    top : ${y}px;
    font-family : arimo;
    max-width : 800px;
    display : flex;
    flex-wrap : wrap;
    background-color : white;
    border-style : solid;
    border-color : orange;
    border-width : 1px;
    border-radius : 5px;
    z-index : 999;
    margin : 0;
    padding : 0;
    box-sizing : border-box;
  }
  *, *:before, *:after {
    box-sizing: inherit;
  }
  #tipRack {
    height : 45px;
    display : flex;
    font-family : inherit;
  }
  #tipBoxExit {
    width : 5%;
    height : 100%;
    min-width : 30px;
    background-color : #f4f4f4;
    display : flex;
    justify-content : center;
    align-items : center;
    cursor : pointer;
    padding : 10px 0px 10px 0px;
  }
  .tipSuggestion {
    background-color : white;
    color : black;
    cursor : pointer;
    border-radius : 5px;
    border-style : solid;
    border-color : orange;
    display : inline-block;
    white-space: nowrap;
    border-width : 1px;
    margin-left : 5px;
    min-width : 80px;
    padding : 5px;
  }
  #confirmationButton {
    background-color : white;
    color : black;
    cursor : pointer;
    border-radius : 5px;
    border-style : solid;
    border-color : orange;
    border-width : 1px;
    padding : 5px;
  }
  .tipContentBar {
    padding : 10px 10px 10px 10px;
    display : flex;
    align-items : center;
    justify-content: space-between;
  }
  #tipSuggestionOther {
    background-color : white;
    color : black;
    cursor : pointer;
    border-radius : 5px;
    border-style : solid;
    border-color : orange;
    border-width : 1px;
    padding : 3px;
    margin-left : 5px;
    min-width : 85px;
    display : flex;
    align-items : center;
    justify-content : space-between;
  }
  .width-40px {
    width : 40px;
  }
  .display-none {
    display : none
  }
  .small-margin-left {
    margin-left : 5px;
  }
  </style>
  <div id="tipBox">
    <div id="tipRack">
    <div id="tipBoxExit">x</div>
    <div id ="tipContentBar" class="tipContentBar">
    <div class="small-margin-left">NOT_VERIFIED</div>
    <div class="small-margin-left">${handle}</div>
    <div class="tipSuggestion" value="${tipSuggestionArr[0] * multiplier}">${curr} ${tipSuggestionArr[0]}</div>
    <div class="tipSuggestion" value="${tipSuggestionArr[1] * multiplier}">${curr} ${tipSuggestionArr[1]}</div>
    <div class="tipSuggestion" value="${tipSuggestionArr[2] * multiplier}">${curr} ${tipSuggestionArr[2]}</div>
    <div class="tipSuggestion" value="${tipSuggestionArr[3] * multiplier}">${curr} ${tipSuggestionArr[3]}</div>
    <div class="tipSuggestion" id="tipSuggestionOther">${curr} <input type="text" id="tipSuggestionOtherInput"class="width-40px"></div>
    </div>
    </div>
  </div>
  `
  tipexists = 1;
  document.body.appendChild(tipBoxInsert);
  document.getElementById("tipBoxExit").onclick = function(){
    let exitedTipBox = document.getElementById("tipBox");
    exitedTipBox.remove();
    tipexists = 0
  }
  let suggestions = document.getElementsByClassName("tipSuggestion")
  for (let suggestion of suggestions){
    suggestion.ondblclick = function(){
        let amt
        if (suggestion.id === "tipSuggestionOther"){
          let multiplier = 1
          amt = document.getElementById("tipSuggestionOtherInput").value
          if (!(curr === "JPY" || curr === "jpy")){
            multiplier = 100
          }
          amt = Math.floor(amt * multiplier)
          if (amt > (tipSuggestionArr[3] * multiplier * 10) ){
            requireConfirmation(amt, curr, handle)
            return
          }
        }
        else {
          amt = suggestion.getAttribute("value")
        }
        suggestion.style.borderWidth = "2px";
        console.log(1);
        getLoginToken()
        .then(function(loginToken){
          return fetchResource('https://prologos.cc/v1/customers/transactions', {
            method : 'POST',
            headers : {
              'Content-Type' : 'application/json'
            },
            body : JSON.stringify({
              cust : loginToken["loginToken"]["customerId"],
              loginToken : loginToken["loginToken"],
              transferTo : {
                platform : "kohlChan",
                handle : handle
              },
              amt : amt.toString()
            })
          })
      })
      .then(function(resp){
        if (!resp.ok){
          throw Error();
        }
        return resp.text();
      })
      .then(function(resp){
        console.log(resp,999);
        document.getElementById("tipContentBar").innerHTML = "Success!"
        tag.innerHTML = `${tag.innerHTML}+1`
        return
      })
      .catch(function(err){
        console.log(err);
        document.getElementById("tipContentBar").innerHTML = "Error occurred."
        return
      })
    }
  }
})
}

var noteTag = function(tag, handle, verified, tipcount){
  tag.innerHTML = tag.innerHTML + ` x${tipcount}`

  let ptag = tag.parentElement;
  ptag.style.borderStyle = "solid";
  ptag.style.padding = "5px";
  ptag.style.borderWidth = "1px";
  ptag.style.borderRadius = "5px";
  ptag.style.borderColor = "orange";
  ptag.onmouseout = function(){
    if (tipBoxTimer){
      clearTimeout(tipBoxTimer);
    }
  }
  ptag.onmouseover = function(e){
      if (tipBoxTimer){
        clearTimeout(tipBoxTimer);
      }
      tipBoxTimer = setTimeout(function(){
        let x = window.pageXOffset + tag.getBoundingClientRect().left;
        let y = window.pageYOffset + tag.getBoundingClientRect().top - 60;
        appendTipBox(x, y, handle, verified, tag);
      },2000)
  }
}

setInterval(function(){
  for (let tag of tags) {
    if (tag.classList.contains("processed") || tag.innerHTML === undefined){
        continue
    }
      let broadMatchResult = tag.innerHTML.match(/!!.*/gm);
      tag.classList.add("processed");
      if (broadMatchResult !== null){
        console.log(broadMatchResult);
          let handle = broadMatchResult[0];
	      console.log(handle);
                let encodedHandle = encodeURIComponent(handle);
                return fetchResource(`https://prologos.cc/v1/customers/identities?platform=kohlChan&handle=${encodedHandle}`)
                .then(function(resp){
                  console.log(resp.ok);
                  if (!resp.ok){
                    console.log(resp.ok, 918)
                    return
                  }
                  else {
                    return resp.text()
                  }
              })
              .then(function(tipcount){
                if (tipcount !== "false"){
                  noteTag(tag, handle, "NOT_VERIFIED", tipcount);
                }
              })
            }
    }
}, '3000')

}, '5000');
})
