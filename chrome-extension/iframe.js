// Miscellaneous global variables.

var stripe = Stripe('pk_test_g1JYQxJv4JXe12wBaE2vIcF700tvVKoZTX');
var elements = stripe.elements();
var cardStyle = {
  base: {
    color: '#32325d',
    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
    fontSmoothing: 'antialiased',
    fontSize: '16px',
    '::placeholder': {
      color: '#aab7c4'
    }
  },
  invalid: {
    color: '#fa755a',
    iconColor: '#fa755a'
  }
}

var card = elements.create('card', {style: cardStyle});
// Miscellaneous global functions

let getLoginToken = function(){
  return new Promise(function(resolve,reject){
    chrome.storage.local.get("loginToken", function(value){
      resolve(value)
    })
  })
}


var stripeTokenHandler = function(token, countryCode, currencyCode, card){
  let chromeStorageSet = function(key, value){
    let keyValue = {};
    keyValue[key] = value;
    return new Promise(function(resolve,reject){
      chrome.storage.local.set(keyValue, function() {
        resolve()
      });
    });
  }
  let tokenId = token.id;
  let acceptedStandardTerms = document.getElementById("dm-cash-terms-and-conditions-checkbox").checked.toString();
  let acceptedTextTerms = document.getElementById("dm-cash-text-terms-and-conditions-checkbox").checked.toString();
  if (acceptedStandardTerms !== "true" || acceptedTextTerms !== "true"){
    showErrorPopup("You must acknowledge that you have read the Terms & Conditions and agree to them.");
    return
  }
  else {
  fetch('https://prologos.cc/v1/customers', {
      method : 'POST',
      headers : {
        'Content-Type' : 'application/json'
      },
      body : JSON.stringify({
        email : document.getElementById('email').value,
        pw : document.getElementById('password').value,
        cnt : countryCode,
        curr : currencyCode,
        acceptedTermsAndConditions : {
          action : (acceptedTextTerms && acceptedStandardTerms),
          date : new Date().toString()
      }})
  })
  .then(function(resp){
    if (!resp.ok){
        return resp.text()
        .then(function(text){
          throw new Error(text)
        })
    }
    return resp.json()
  })
  .then(function(obj){
    let {responseToken, setupIntentSecret} = obj;
    return Promise.all([
      stripe.confirmCardSetup(setupIntentSecret, {
        payment_method: {
          card: card
        }
      }),
      chromeStorageSet("loginToken", responseToken)
    ])
  })
  .then(function(){
    if (countryCode !== "OTHER"){
    countryTermsPage.style.display = "none";
    socialMediaLinkPage.style.display = "block";
    return
    }
    else {
      return getLoginToken()
      .then(function(loginToken){
        return fetch('https://prologos.cc/v1/customers/data', {
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
    .then(function(resp){
      return resp.json()
    })
    .then(function(json){
      let walletCountry = document.getElementById('wallet-country');
      let walletCurrency = document.getElementById('wallet-currency');
      let activeCard = document.getElementById('wallet-activecard');
      let homePage = document.getElementById('home-page')
      walletCountry.innerHTML = json[0]["localizationInformation"]["cnt"];
      walletCurrency.innerHTML = json[0]["localizationInformation"]["curr"];
      chrome.storage.local.set({"walletCurrency" : json[0]["localizationInformation"]["curr"]});
      activeCard.innerHTML = `**** **** **** ${json[1]["last4"]}`
      countryTermsPage.style.display = "none";
      homePage.style.display = "block";
      return
    })
  }
  })
  .catch(function(error){
      try {
        error = JSON.parse(error.message);
      }
      catch {
        showErrorPopup("Extension error - Error Code : 5");
        return
      }
        showErrorPopup(error.text);
        return
})
}
}

var cardChangeHandler = function(loginToken, cardToken){
  loginToken = loginToken.loginToken
  let options = {
    method : 'POST',
    body : JSON.stringify({cust : loginToken["customerId"],loginToken : loginToken})
  }
  return fetch("https://prologos.cc/v1/customers/cards", options)
  .then(function(resp){
    return resp.text();
  })
  .then(function(setupIntentSecret){
    return stripe.confirmCardSetup(setupIntentSecret, {
        payment_method: {
          card: card
        }
    })
  })
  .then(function(resp){
    return
  })
}

var country_arr = [
 {country: 'Australia', code: 'AU', curr: 'AUD', taxMultiplier : '0.1'},
 {country: 'Belgium', code: 'BE', curr: 'EUR', taxMultiplier : '0.21'},
 {country: 'Austria', code: 'AT', curr: 'EUR', taxMultiplier : '0.2'},
 {country: 'Bulgaria', code: 'BG', curr: 'BGN', taxMultiplier : '0.2'},
 {country: 'Brazil ', code: 'BR', curr: 'BRL', taxMultiplier : '0'},
 {country: 'Canada', code: 'CA', curr: 'CAD', taxMultiplier : '0',
 provincialTaxMultiplier : {'CAQC' : '0.09975', 'CASK' : '0.06', 'CABC' : '0.07'}},
 {country: 'Cyprus', code: 'CY', curr: 'EUR', taxMultiplier : '0.19'},
 {country: 'Czech Republic', code: 'CZ', curr: 'CZK', taxMultiplier : '0.21'},
 {country: 'Denmark', code: 'DK', curr: 'DKK', taxMultiplier : '0.25'},
 {country: 'Estonia', code: 'EE', curr: 'EUR', taxMultiplier : '0.2'},
 {country: 'Finland', code: 'FI', curr: 'EUR', taxMultiplier : '0.24'},
 {country: 'France', code: 'FR', curr: 'EUR', taxMultiplier : '0.2'},
 {country: 'Germany', code: 'DE', curr: 'EUR', taxMultiplier : '0.16'},
 {country: 'Greece', code: 'GR', curr: 'EUR', taxMultiplier : '0.24'},
 {country: 'Hong Kong', code: 'HK', curr: 'HKD', taxMultiplier : '0'},
 {country: 'Hungary', code: 'HU', curr: 'HUF', taxMultiplier : '0.27'},
 {country: 'India', code: 'IN', curr: 'INR', taxMultiplier : '0.18'},
 {country: 'Ireland', code: 'IE', curr: 'EUR', taxMultiplier : '0.23'},
 {country: 'Italy', code: 'IT', curr: 'EUR', taxMultiplier : '0.22'},
 {country: 'Japan', code: 'JP', curr: 'JPY', taxMultiplier : '0.10'},
 {country: 'Latvia', code: 'LV', curr: 'EUR', taxMultiplier : '0.21'},
 {country: 'Lithuania', code: 'LT', curr: 'EUR', taxMultiplier : '0.21'},
 {country: 'Luxembourg', code: 'LU', curr: 'EUR', taxMultiplier : '0.17'},
 {country: 'Malaysia', code: 'MY', curr: 'MYR', taxMultiplier : '0.06'},
 {country: 'Malta', code: 'MT', curr: 'EUR', taxMultiplier : '0.18'},
 {country: 'Netherlands', code: 'NL', curr: 'EUR', taxMultiplier : '0.21'},
 {country: 'New Zealand', code: 'NZ', curr: 'NZD', taxMultiplier : '0.15'},
 {country: 'Norway', code: 'NO', curr: 'NOK', taxMultiplier : '0.25'},
 {country: 'Poland', code: 'PL', curr: 'PLN', taxMultiplier : '0.23'},
 {country: 'Portugal', code: 'PT', curr: 'EUR', taxMultiplier : '0.23'},
 {country: 'Romania', code: 'RO', curr: 'RON', taxMultiplier : '0.19'},
 {country: 'Singapore', code: 'SG', curr: 'SGD', taxMultiplier : '0.07'},
 {country: 'Slovakia', code: 'SK', curr: 'EUR', taxMultiplier : '0.2'},
 {country: 'Slovenia', code: 'SI', curr: 'EUR', taxMultiplier : '0.22'},
 {country: 'Spain', code: 'ES', curr: 'EUR', taxMultiplier : '0.21'},
 {country: 'Sweden', code: 'SE', curr: 'SEK', taxMultiplier : '0.25'},
 {country: 'Switzerland', code: 'CH', curr: 'CHF', taxMultiplier : '0.077'},
 {country: 'United Kingdom', code: 'GB', curr: 'GBP', taxMultiplier : '0.2'},
 {country: 'United States', code: 'US', curr: 'USD', taxMultiplier : '0.1'},
 {country: "My Country Isn't Listed", code:"OTHER", curr:"USD"}
]
// Error popup & its error handlers.

var errorPopup = document.getElementById('error-popup');
var errorPopupMessage = document.getElementById('error-popup-message');
var errorPopupExit = document.getElementById('error-popup-exit');
errorPopupExit.onmouseover = function(){
  errorPopupExit.style.textDecoration = "underline";
}
errorPopupExit.onmouseout = function(){
  errorPopupExit.style.textDecoration = "none";
}
errorPopupExit.onclick = function(){
  errorPopup.style.display = "none";
}
let showErrorPopup = function(message){
  errorPopupMessage.textContent = message;
  errorPopup.style.display = "block";
}

// Primary pages.

let initPage = document.getElementById("init-page"), signUpPage = document.getElementById("sign-up-page"),
countryTermsPage = document.getElementById("country-terms-page"), loginPage = document.getElementById("log-in-page"),
socialMediaLinkPage = document.getElementById("social-media-link-page"), homePage = document.getElementById("home-page");

// Buttons for navigation between primary pages & their event handlers.

// INIT <-> LOGIN
let fromInitToLoginButton = document.getElementById("from-initpage-to-loginpage-button"),
fromLoginToInitButton = document.getElementById("from-loginpage-to-initpage-button");

fromInitToLoginButton.onclick = function(){
  chrome.storage.local.clear();
  initPage.style.display = "none";
  loginPage.style.display = "block";
};
fromLoginToInitButton.onclick = function(){
  loginPage.style.display = "none";
  initPage.style.display = "block";
};

// INIT <-> SIGNUP
let fromInitToSignupButton = document.getElementById("from-initpage-to-signuppage-button"),
fromSignUpToInitButton = document.getElementById("from-signuppage-to-initpage-button");

fromInitToSignupButton.onclick = function(){
  initPage.style.display = "none";
  signUpPage.style.display = "block";
}
fromSignUpToInitButton.onclick = function(){
  signUpPage.style.display = "none";
  initPage.style.display = "block";
}

// SIGNUP <-> COUNTRYTERMS
let fromSignUpToCountryTermsButton = document.getElementById("from-signuppage-to-countrytermspage-button"),
fromCountryTermsToSignUpButton = document.getElementById("from-countrytermspage-to-signuppage-button");

fromSignUpToCountryTermsButton.onclick = function(){
  signUpPage.style.display = "none";
  countryTermsPage.style.display = "block";
}
fromCountryTermsToSignUpButton.onclick = function(){
  countryTermsPage.style.display = "none";
  signUpPage.style.display = "block";
}


// Home page subpages.

let walletPage = document.getElementById("wallet-page");
let txHistoryPage = document.getElementById("tx-hist-page");
let profilePage = document.getElementById("profile-page");
// Header buttons for navigation to home page subpages & their event handlers.

let walletHomepageHeaderButton = document.getElementById("wallet-homepage-header-button");
walletHomepageHeaderButton.onclick = function(){
  txHistoryPage.style.display = "none";
  profilePage.style.display = "none";
  walletPage.style.display = "block";
}

let txHistHomepageHeaderButton = document.getElementById("tx-hist-homepage-header-button")


let profileHomepageHeaderButton = document.getElementById("profile-homepage-header-button");
profileHomepageHeaderButton.onclick = function(){
  walletPage.style.display = "none";
  txHistoryPage.style.display = "none";
  profilePage.style.display = "block";
}
let socialMediaLinkPageHeaderButton = document.getElementById("socialmedialinkpage-homepage-header-button");
let fromSocialMediaLinkPageToHomePageButton = document.getElementById("from-socialmedialinkpage-to-homepage-button");
socialMediaLinkPageHeaderButton.onclick = function(){
  fromSocialMediaLinkPageToStripeConnectPageButton.style.display = "none";
  fromSocialMediaLinkPageToHomePageButton.style.display = "block";
  homePage.style.display = "none";
  socialMediaLinkPage.style.display = "block";
}
fromSocialMediaLinkPageToHomePageButton.onclick = function(){
  fromSocialMediaLinkPageToHomePageButton.style.display = "none";
  fromSocialMediaLinkPageToStripeConnectPageButton.style.display = "block";
  socialMediaLinkPage.style.display = "none";
  homePage.style.display = "block";
}

// walletPage functionality
let walletPageChangeCardButton = document.getElementById("wallet-change-card-button");
walletPageChangeCardButton.onclick = function(){
  walletPage.style.display = "none";
  profilePage.style.display = "block";
}
// txHistoryPage subpages.

let outgoingTxHistPage = document.getElementById("outgoing-tx-hist-page");
let incomingTxHistPage = document.getElementById("incoming-tx-hist-page");

// Buttons for navigation to txHistoryPage subpages & their event handlers.

let outgoingTxHistPageButton = document.getElementById("show-outgoing-tx-hist-page-button");
let outgoingTxHistPageNoHist = document.getElementById("outgoing-tx-hist-page-no-hist");
let outgoingTxButtonText = document.getElementById("outgoing-tx-button-text");

let incomingTxHistPageButton = document.getElementById("show-incoming-tx-hist-page-button");
let incomingTxHistPageNoHist = document.getElementById("incoming-tx-hist-page-no-hist");
let outgoingTxHistoryData
let incomingTxHistoryData

let setUpOutgoingTx = function(next){
  return getLoginToken()
  .then(function(loginToken){
    let startingAfter
    if (next){
      startingAfter = outgoingTxHistoryData[outgoingTxHistoryData.length - 1]["id"]
    }
    return fetch('https://prologos.cc/v1/customers/transactions/records', {
    method : 'POST',
    headers : {
      'Content-Type' : 'application/json'
    },
    body : JSON.stringify({
      direction : "outgoing",
      loginToken : loginToken["loginToken"],
      cust : loginToken["loginToken"]["customerId"],
      startingAfter : startingAfter
    })
  })
  })
  .then(function(resp){
    return resp.json();
  })
  .then(function(respArr){
    outgoingTxHistoryData = respArr["data"];
    respArr = respArr["data"];
    if (respArr[0] === undefined){
      throw new Error();
    }
    let outgoingTxInserts = document.getElementsByClassName("outgoingTxInsert");
    while(outgoingTxInserts[0]){
      outgoingTxInserts[0].parentNode.removeChild(outgoingTxInserts[0]);
    }
    for (let entry of respArr){
      let date = new Date(entry["created"] * 1000);
      let multiplier
      if (entry.currency === "jpy"){
        multiplier = 1;
      }
      else {
        multiplier = 100;
      }
      let month = date.getMonth() + 1;
      let day = date.getDate();
      let year = date.getYear() - 100;
      let txHtmlInsert = document.createElement("span");
      let buttonClass, buttonText
      if (entry["amount_refunded"] > 0){
        buttonClass = "", buttonText = "Refund_Success"
      }
      else {
        buttonClass = "refund-button", buttonText = "Refund"
      }
      txHtmlInsert.innerHTML = `
      <div class="small-padding-left width-100 flex main-space-between small-padding-top small-padding-right cross-center">
      <div>${month}/${day}/${year}</div>
      <div>${(entry.metadata.platform || "Platform_Unrecorded")}</div>
      <div>to ${(entry.metadata.to || "User_Unrecorded")}</div>
      <div>${entry.currency.toUpperCase()} ${(entry.amount/multiplier).toString()}</div>
      <button class="${buttonClass}" value="${entry.id}">${buttonText}</button>
      </div>
      `
      txHtmlInsert.classList.add("outgoingTxInsert");
      outgoingTxHistPage.appendChild(txHtmlInsert);

    }
    let refundButtons = document.getElementsByClassName("refund-button");
    for (let button of refundButtons){
      button.onclick = function(){
        getLoginToken()
        .then(function(loginToken){
          return fetch('https://prologos.cc/v1/customers/transactions/refunds', {
          method : 'POST',
          headers : {
            'Content-Type' : 'application/json'
          },
          body : JSON.stringify({
            loginToken : loginToken["loginToken"],
            chargeId : button.getAttribute("value")
          })
        })
        })
        .then(function(resp){
          return resp.text()
        })
        .then(function(text){
          if (text === "OK"){
            button.innerHTML = "Refund_Success";
            showErrorPopup(`Notice : As stated in our terms & conditions, we do not permit
            the automatic refund of transaction fees. If you believe fraudulent payments have been made on your account, or are losing more than
            $USD 10 due to the witholding of transaction fees, please email our staff at support@dm.cash so that we may consider
            refunding you in full.`)
            button.classList.remove("refund-button");
          }
          else {
            showErrorPopup("Refund failed.")
          }
        })
        .catch(function(err){
          showErrorPopup("Refund failed.")
        })
      }
      return
    }
  })
  .then(function(){
    incomingTxHistPageNoHist.style.display = "none";
    incomingTxHistPageButton.style.textDecoration = "none";
    incomingTxHistPage.style.display = "none";
    outgoingTxButtonText.style.textDecoration = "underline";
    outgoingTxHistPageNoHist.style.display = "none";
    outgoingTxHistPage.style.display = "block";
  })
  .catch(function(err){
    let outgoingTxInserts = document.getElementsByClassName("outgoingTxInsert");
    while(outgoingTxInserts[0]){
      outgoingTxInserts[0].parentNode.removeChild(outgoingTxInserts[0]);
    }
    incomingTxHistPageNoHist.style.display = "none";
    incomingTxHistPageButton.style.textDecoration = "none";
    incomingTxHistPage.style.display = "none";
    outgoingTxButtonText.style.textDecoration = "underline";
    outgoingTxHistPageNoHist.style.display = "block";
    outgoingTxHistPage.style.display = "block";
  })
}
outgoingTxHistPageButton.onclick = function(){
  setUpOutgoingTx()
}

txHistHomepageHeaderButton.onclick = function(){
  profilePage.style.display = "none";
  walletPage.style.display = "none";
  txHistoryPage.style.display = "block";
  setUpOutgoingTx();
}

// profile Page functionality
let changeConnectProfileButton = document.getElementById("change-connect-profile-button");
let initPasswordChangeButton = document.getElementById("init-password-change-button");
let submitCardChangeButton = document.getElementById("submit-card-change-button");
submitCardChangeButton.onclick = function(){
  stripe.createToken(card)
  .then(function(result){
    return getLoginToken()
    .then(function(loginToken){
      return cardChangeHandler(loginToken, result)
    })
  })
}
initPasswordChangeButton.onclick = function(){
  getLoginToken().then(function(loginToken){
    return fetch('https://prologos.cc/v1/customers/lock', {
    method : 'POST',
    headers : {
      'Content-Type' : 'application/json'
    },
    body : JSON.stringify({
      cust : loginToken["loginToken"]["customerId"],
      loginToken : loginToken["loginToken"]
    })
  })
  })
  .then(function(resp){
    return resp.text()
  })
  .then(function(text){
    homePage.style.display = "none";
    showErrorPopup(`Your request for a password reset has been received. Log out or exit the session, and then
    attempt to log in again, to finalize the process.`);
    return
  })
}
let toLoginLink = function(){
  getLoginToken().then(function(loginToken){
    return fetch('https://prologos.cc/v1/customers/stripe_connect_accounts/login_links', {
    method : 'POST',
    headers : {
      'Content-Type' : 'application/json'
    },
    body : JSON.stringify({
      id : loginToken["loginToken"]["customerId"],
    })
  })
  })
  .then(function(resp){
    return resp.text();
  })
  .then(function(text){
    window.top.location.href = text;
    return
  })
}
let setUpIncomingTx = function(next){
  let startingAfter
  if (next){
    startingAfter = incomingTxHistoryData[incomingTxHistoryData.length - 1]["id"];
  }
  getLoginToken()
  .then(function(loginToken){
    return fetch('https://prologos.cc/v1/customers/transactions/records', {
    method : 'POST',
    headers : {
      'Content-Type' : 'application/json'
    },
    body : JSON.stringify({
      direction : "incoming",
      loginToken : loginToken["loginToken"],
      cust : loginToken["loginToken"]["customerId"],
      startingAfter : startingAfter
    })
    })
  })
  .then(function(resp){
    return resp.json();
  })
  .then(function(respArr){
    let incomingTxInserts = document.getElementsByClassName("incomingTxInsert");
    while(incomingTxInserts[0]){
      incomingTxInserts[0].parentNode.removeChild(incomingTxInserts[0]);
    }
    if (respArr[0] === undefined){
      throw new Error();
    }
    incomingTxHistoryData = respArr
    for (let entry of respArr){
      let multiplier
      if (entry.currency === "jpy"){
        multiplier = 1;
      }
      else {
        multiplier = 100
      }
      let date = new Date(entry["created"] * 1000);
      let month = date.getMonth() + 1;
      let day = date.getDate();
      let txHtmlInsert = document.createElement("span");
      txHtmlInsert.classList.add("incomingTxInsert");
      let incomingValue = `${entry.currency.toUpperCase()} ${((entry.amount - entry["application_fee_amount"])/multiplier)}`

      if (entry["application_fee_amount"] === entry["amount"]){
        incomingValue = "CONTRB. TO FEE"
      }

      if (entry["amount_reversed"] > 0){
        incomingValue = "REFUNDED"
      }
      txHtmlInsert.innerHTML = `
      <div class="small-padding-left width-100 flex main-space-between small-padding-top small-padding-right">
      <div>${month}/${day}</div>
      <div>${(entry.metadata.platform || "Platform_Unrecorded")}</div>
      <div>by ${(entry.metadata.by || "User_Unrecorded")}</div>
      <div>${incomingValue}</div>
      </div>
      `
      incomingTxHistPage.appendChild(txHtmlInsert);
    }
    return
  })
  .then(function(){
    outgoingTxButtonText.style.textDecoration = "none";
    outgoingTxHistPage.style.display = "none"
    incomingTxHistPageNoHist.style.display = "none";
    incomingTxHistPageButton.style.textDecoration = "underline";
    incomingTxHistPage.style.display = "block";
  })
  .catch(function(err){
    let incomingTxInserts = document.getElementsByClassName("incomingTxInsert");
    while(incomingTxInserts[0]){
      incomingTxInserts[0].parentNode.removeChild(incomingTxInserts[0]);
    }
    outgoingTxButtonText.style.textDecoration = "none";
    outgoingTxHistPage.style.display = "none"
    incomingTxHistPage.style.display = "block";
    incomingTxHistPageButton.style.textDecoration = "underline";
    incomingTxHistPageNoHist.style.display = "block";
  })
}

incomingTxHistPageButton.onclick = function(){
  setUpIncomingTx();
}

document.getElementById("tx-history-next-button").onclick = function(){
  if (outgoingTxHistPage.style.display === "block"){
    setUpOutgoingTx(true)
  }
  if (incomingTxHistPage.style.display === "block"){
    setUpIncomingTx(true);
  }
}
let showPayoutsButton = document.getElementById('show-payouts-button');
showPayoutsButton.onclick = function(){
  return toLoginLink();
}
changeConnectProfileButton.onclick = function(){
  return toLoginLink();
}

// socialMediaLinkPage subpages
let chanLinkPage = document.getElementById("chan-link-page");
let twitterLinkPage = document.getElementById("twitter-link-page");
let kohlLinkPage = document.getElementById("kohl-link-page");
let redditLinkPage = document.getElementById("reddit-link-page");
let stripeConnectPage = document.getElementById("stripe-connect-page");

// Buttons for navigation to and from socialMediaLinkPage subpages & to/from StripeConnectPage

let fromSocialMediaLinkPageToChanLinkPageButton = document.getElementById('from-socialmedialinkpage-to-chanlinkpage-button')
fromSocialMediaLinkPageToChanLinkPageButton.onclick = function(){
  socialMediaLinkPage.style.display = "none";
  chanLinkPage.style.display = "block";
}
let fromChanLinkPageToSocialMediaLinkPageButton = document.getElementById('from-chanlinkpage-to-socialmedialinkpage-button');
fromChanLinkPageToSocialMediaLinkPageButton.onclick = function(){
  chanLinkPage.style.display = "none";
  socialMediaLinkPage.style.display = "block";
}

let fromSocialMediaLinkPageToTwitterLinkPageButton = document.getElementById("from-socialmedialinkpage-to-twitterlinkpage-button");
fromSocialMediaLinkPageToTwitterLinkPageButton.onclick = function(){
  socialMediaLinkPage.style.display = "none";
  twitterLinkPage.style.display = "block";
}
let fromTwitterLinkPageToSocialMediaLinkPageButton = document.getElementById("from-twitterlinkpage-to-socialmedialinkpage-button");
fromTwitterLinkPageToSocialMediaLinkPageButton.onclick = function(){
  twitterLinkPage.style.display = "none";
  socialMediaLinkPage.style.display = "block";
}

let fromSocialMediaLinkPageToKohlLinkPageButton = document.getElementById("from-socialmedialinkpage-to-kohllinkpage-button");
fromSocialMediaLinkPageToKohlLinkPageButton.onclick = function(){
  kohlLinkPage.style.display = "block";
  socialMediaLinkPage.style.display = "none";
}
let fromKohlLinkPageToSocialMediaLinkPageButton = document.getElementById("from-kohllinkpage-to-socialmedialinkpage-button");
fromKohlLinkPageToSocialMediaLinkPageButton.onclick = function(){
  kohlLinkPage.style.display = "none";
  socialMediaLinkPage.style.display = "block";
}

let fromSocialMediaLinkPageToRedditLinkPageButton = document.getElementById("from-socialmedialinkpage-to-redditlinkpage-button");
fromSocialMediaLinkPageToRedditLinkPageButton.onclick = function(){
  socialMediaLinkPage.style.display = "none";
  redditLinkPage.style.display = "block";
}
let fromRedditLinkPageToSocialMediaLinkPageButton = document.getElementById("from-redditlinkpage-to-socialmedialinkpage-button");
fromRedditLinkPageToSocialMediaLinkPageButton.onclick = function(){
  redditLinkPage.style.display = "none";
  socialMediaLinkPage.style.display = "block";
}

let fromSocialMediaLinkPageToStripeConnectPageButton = document.getElementById("from-socialmedialinkpage-to-stripeconnectpage-button");
fromSocialMediaLinkPageToStripeConnectPageButton.onclick = function(){
  socialMediaLinkPage.style.display = "none";
  stripeConnectPage.style.display = "block";
}

// 4channel link page functionality

let chanSecureTripcode = document.getElementById('chan-secure-tripcode');
let chanIdentitySubmitButton = document.getElementById('chan-identity-submit-button');

chanIdentitySubmitButton.onclick = function(){
  let trip = chanSecureTripcode.value;
  getLoginToken()
  .then(function(loginToken){
    return fetch('https://prologos.cc/v1/customers/identities', {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json'
        },
        body : JSON.stringify({
          cust : loginToken["loginToken"]["customerId"],
          tokenId : loginToken["loginToken"]["tokenId"],
          platform : "fourChannel",
          handle : trip
        })
    })
  })
  .then(function(value){
    return
  })
  .then(function(){
    fromSocialMediaLinkPageToChanLinkPageButton.style.backgroundColor = "#90ee90";
    fromSocialMediaLinkPageToChanLinkPageButton.innerHTML = "✓"
    chanLinkPage.style.display = "none";
    socialMediaLinkPage.style.display = "block";
  })
}

// Twitter link page functionality.

let twitterHandleIdentityField = document.getElementById('twitter-handle-identity-field');
let twitterIdentitySubmitButton = document.getElementById('twitter-identity-submit-button');

twitterIdentitySubmitButton.onclick = function(){
  let handle = twitterHandleIdentityField.value;
  getLoginToken()
  .then(function(loginToken){
    return fetch('https://prologos.cc/v1/customers/identities', {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json'
        },
        body : JSON.stringify({
          cust : loginToken["loginToken"]["customerId"],
          tokenId : loginToken["loginToken"]["tokenId"],
          platform : "twitter",
          handle : handle
        })
    })
  })
  .then(function(value){
    return
  })
  .then(function(){
    fromSocialMediaLinkPageToTwitterLinkPageButton.style.backgroundColor = "#90ee90";
    fromSocialMediaLinkPageToTwitterLinkPageButton.innerHTML = "✓"
    twitterLinkPage.style.display = "none";
    socialMediaLinkPage.style.display = "block";
  })
}

let kohlHandleIdentityField = document.getElementById('kohl-handle');
let kohlIdentitySubmitButton = document.getElementById('kohl-identity-submit-button');
kohlIdentitySubmitButton.onclick = function(){
  let handle = kohlHandleIdentityField.value;
  getLoginToken()
  .then(function(loginToken){
    return fetch('https://prologos.cc/v1/customers/identities', {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json'
        },
        body : JSON.stringify({
          cust : loginToken["loginToken"]["customerId"],
          tokenId : loginToken["loginToken"]["tokenId"],
          platform : "kohlChan",
          handle : handle
        })
    })
  })
  .then(function(value){
    return
  })
  .then(function(){
    fromSocialMediaLinkPageToKohlLinkPageButton.style.backgroundColor = "#90ee90";
    fromSocialMediaLinkPageToKohlLinkPageButton.innerHTML = "✓"
    kohlLinkPage.style.display = "none";
    socialMediaLinkPage.style.display = "block";
  })
}

let redditUname = document.getElementById("reddit-uname");
let redditIdentitySubmitButton = document.getElementById("reddit-identity-submit-button");
redditIdentitySubmitButton.onclick = function(){
  let handle = redditUname.value;
  getLoginToken()
  .then(function(loginToken){
    return fetch('https://prologos.cc/v1/customers/identities', {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json'
        },
        body : JSON.stringify({
          cust : loginToken["loginToken"]["customerId"],
          tokenId : loginToken["loginToken"]["tokenId"],
          platform : "reddit",
          handle : handle
        })
    })
  })
  .then(function(value){
    return
  })
  .then(function(){
    fromSocialMediaLinkPageToRedditLinkPageButton.style.backgroundColor = "#90ee90";
    fromSocialMediaLinkPageToRedditLinkPageButton.innerHTML = "✓"
    redditLinkPage.style.display = "none";
    socialMediaLinkPage.style.display = "block";
  })
}
// Stripe Connect Page functionality

let stripeConnectButton = document.getElementById("stripe-connect-page");
stripeConnectButton.onclick = function(){
  getLoginToken().then(function(loginToken){
    window.top.location.href = `https://connect.stripe.com/express/oauth/authorize?client_id=ca_HkuDxM8yvnWDsi59dqFShNCRwk0Dh4ji&state=${loginToken["loginToken"]["customerId"]}`
    return
  })
}

//lockedPage functionality
let lockedPage = document.getElementById("locked-page");
let newPassButton = document.getElementById("submit-phonecode-and-newpass-button");
let newPass = document.getElementById("new-pass");
let code = document.getElementById("phone-code");
newPassButton.onclick = function(e){
  e.preventDefault();
  chrome.storage.local.get("lockedCustomerId", function(lockedCustomerId){
  fetch('https://prologos.cc/v1/customers/unlock', {
    method : 'POST',
    headers : {
      'Content-Type' : 'application/json'
    },
    body : JSON.stringify({
      cust : lockedCustomerId["lockedCustomerId"],
      newpass : newPass.value,
      loginToken : {
        tokenId : code.value,
        customerId : lockedCustomerId["lockedCustomerId"],
        exp : "99999999999999999999"
      }
    })
  })
  .then(function(resp){
    return resp.text();
  })
  .then(function(text){
    if (text === "OK"){
      lockedPage.style.display = "none";
      showErrorPopup(`Password reset successful. You may exit the session and attempt to log-in again.`)
    }
    else{
      showErrorPopup(`Something went wrong.`)
    }
  })
  })
}

//loginPage functionality

let loginSubmitButton = document.getElementById("login-submit-button");
let emailForLogin = document.getElementById("email-for-login");
let passwordForLogin = document.getElementById("password-for-login");
loginSubmitButton.onclick = function(e){
  e.preventDefault();
  fetch('https://prologos.cc/v1/customers/login_tokens', {
    method : 'POST',
    headers : {
      'Content-Type' : 'application/json'
    },
    body : JSON.stringify({
      email : emailForLogin["value"],
      pw : passwordForLogin["value"]
    })
  })
  .then(function(resp){
    return resp.json()
  })
  .then(function(json){
    if (json["locked"]){
      return new Promise(function(resolve, reject){
      chrome.storage.local.set({"lockedCustomerId" : json["locked"]}, function(){
        loginPage.style.display = "none";
        lockedPage.style.display = "block";
        reject();
      })
    })
  }
    return chrome.storage.local.set({"loginToken" : json}, function(){
      getLoginToken()
      .then(function(loginToken){
        return fetch('https://prologos.cc/v1/customers/data', {
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
    .then(function(resp){
      return resp.json()
    })
    .then(function(json){
      let walletCountry = document.getElementById('wallet-country');
      let walletCurrency = document.getElementById('wallet-currency');
      let activeCard = document.getElementById('wallet-activecard');
      let homePage = document.getElementById('home-page')
      walletCountry.innerHTML = json[0]["localizationInformation"]["cnt"];
      walletCurrency.innerHTML = json[0]["localizationInformation"]["curr"];
      chrome.storage.local.set({"walletCurrency" : json[0]["localizationInformation"]["curr"]})
      chrome.storage.local.set({"initState" : "active"})
      if (json[1]){
        activeCard.innerHTML = `**** **** **** ${json[1]["card"]["last4"]}`
      }
      else {
        activeCard.innerHTML = "NO_ACTIVE_CARD"
      }
      card.unmount('#card-element');
      card.mount('#card-element-for-changes');
      loginPage.style.display = "none";
      homePage.style.display = "block";
      walletPage.style.display = "block";
      return
    })
    })
  })
  .catch(function(err){
    console.log(err);
  })
}


// signUpPage & countryTermsPage

let initSignUpAndCountryTerms = function(){

  // signUpPage card form

  // countryTermsPage dropdown
  let initCountryDropdown = function(){
    let countrySelect = document.getElementById("countrySelect");
    // populating
    countrySelect.length=0;
    countrySelect.options[0] = new Option('Select Country','Select Country');
    countrySelect.selectedIndex = 0;
    for (var i=0; i<country_arr.length; i++) {
      countrySelect.options[countrySelect.length] = new Option(country_arr[i]["country"],country_arr[i]["country"]);
    }
    // Error on unlisted country
    let showErrorIfCountryOther = function(logValue){
      if (this.value === "My Country Isn't Listed"){
        showErrorPopup("Residents of unlisted countries ('My Country Isn't Listed') are able to send but not receive money through dm-cash. Additionally, \
        their cards will be charged in U.S. dollars instead of native currency, which may incur additional fees. \
        We apologize for the inconvenience.");
      }
      countrySelect.addEventListener('change', showErrorIfCountryOther, false);
    }
  }
  initCountryDropdown();

  // countryTermsPage signUpSubmit button & event handlers.
  let signUpSubmitButton = document.getElementById("sign-up-submit-button");
  signUpSubmitButton.onclick = function(){
    stripe.createToken(card).then(function(result){
      let countryElement = document.getElementById("countrySelect");
      let countryCode, currencyCode
      if (countryElement.value === "Select Country"){
        showErrorPopup("Please select your country of residence.");
        return
      }
      if (result.error){
        showErrorPopup(result.error.message);
        return
      }
      for (let x of country_arr){
        if (x["country"] === countryElement.value){
          countryCode = x.code, currencyCode = x.curr
        }
      }
      return stripeTokenHandler(result.token, countryCode, currencyCode, card);
    })
  }
}

initSignUpAndCountryTerms();
// Aesthetic manipulations.


var profileLinkButtons = document.getElementsByClassName('profile-link-button');
for (let x of profileLinkButtons){
  x.onmouseover = function(){
    x.classList.add("pulse");
  }
  x.onmouseout = function(){
    x.classList.remove("pulse");
  }
}

var menuButtons = document.getElementsByClassName('menu-button');
for (let x of menuButtons){
  x.onmouseover = function(){
    x.classList.add("dark-grey-bg")
  }
  x.onmouseout = function(){
    x.classList.remove("dark-grey-bg");
  }
}

let initItNow = function(){
  chrome.storage.local.get("initState", function(initState){
    initState = initState.initState
if (initState === "login_needed"){
  initPage.style.display = "block";
  card.mount('#card-element');
}

if (initState === "awaiting_identities"){
  socialMediaLinkPage.style.display = "block";
  card.mount('#card-element-for-changes');
} if (initState === "awaiting_stripe_connect"){
  stripeConnectPage.style.display = "block";
  card.mount('#card-element-for-changes');
}
if (initState === "active"){
  getLoginToken()
  .then(function(loginToken){
    return fetch('https://prologos.cc/v1/customers/data', {
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
.then(function(resp){
  if (!resp.ok){
    throw new Error();
  }
  return resp.json()
})
.then(function(json){
  let walletCountry = document.getElementById('wallet-country');
  let walletCurrency = document.getElementById('wallet-currency');
  let activeCard = document.getElementById('wallet-activecard');
  let homePage = document.getElementById('home-page')
  let walletPage = document.getElementById('wallet-page')
  walletCountry.innerHTML = json[0]["localizationInformation"]["cnt"];
  walletCurrency.innerHTML = json[0]["localizationInformation"]["curr"];
  if (json[1]){
    activeCard.innerHTML = `**** **** **** ${json[1]["card"]["last4"]}`
  }
  else {
    activeCard.innerHTML = "NO_ACTIVE_CARD"
  }
  card.mount('#card-element-for-changes');
  initPage.style.display = "none";
  homePage.style.display = "block";
  walletPage.style.display = "block";
  return
})
}
})
}

initItNow();
