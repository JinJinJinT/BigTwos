("use strict");
import { makeRequest } from "./apiFunctions";

(function () {
  window.addEventListener("load", init);
  let timer;
  function init() {
    const startBtn = document.getElementById("start-button");
    startBtn.addEventListener("click", queueGameStart);
    timer = setInterval(checkGameStart, 1000);
  }

  async function checkGameStart() {
    try {
      let response = await makeRequest("/gameStarted");
      console.log(response);
      updateList(response.playersReady);
      if (response.gameStarted == "true") {
        startSequence();
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function updateList(players) {
    let list = document.getElementById("players-list");
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
    try {
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
    } catch (err) {
      console.log(err);
    }
  }
})();
