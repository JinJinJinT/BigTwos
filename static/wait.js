("use strict");
import { makeRequest } from "./apiFunctions.js";

(function () {
  window.addEventListener("load", init);
  let timer;
  function init() {
    const startBtn = document.getElementById("start-button");
    startBtn.addEventListener("click", queueGameStart);
    timer = setInterval(checkGameStart, 1000);
    console.log("init");
  }

  async function checkGameStart() {
    try {
      let response = await makeRequest("/gameStarted");
      if (typeof response !== "object") startSequence();
      let players = await makeRequest("/players");
      updateList(players);
    } catch (err) {
      console.log(err);
    }
  }

  async function updateList(players) {
    let list = document.getElementById("player-list");
    list.innerHTML = "";
    for (let player of players) {
      let li = document.createElement("li");
      li.textContent = player;
      list.appendChild(li);
    }
  }

  async function queueGameStart() {
    try {
      let response = await makeRequest("/playerReady");
      console.log(response);
    } catch (err) {
      console.log(err);
    }
  }

  async function startSequence() {
    clearInterval(timer);
    let message = document.getElementById("start-message");
    let countDown = 5;
    timer = setInterval(() => {
      if (countDown) {
        message.textContent = `Game starting in ${countDown} seconds`;
        countDown--;
      } else {
        clearInterval(timer);
        window.location.href = "/";
      }
    }, 1000);
  }
})();
