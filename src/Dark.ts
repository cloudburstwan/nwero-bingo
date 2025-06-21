// Handles dark mode management and switching.
let darkModeDefault =
  (window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches &&
    (localStorage.getItem("theme") === "dark" || localStorage.getItem("theme") === null)) ||
  localStorage.getItem("theme") === "dark";
let darkTheme = false;

function switchTheme() {
  if (darkTheme) {
    document.body.classList.remove("dark");
    document.getElementsByClassName("logo")[0].getElementsByTagName("img")[0].src = "/assets/logo.webp";
    document.getElementsByClassName("logo")[0].getElementsByTagName("span")[0].innerText = "Nwero Bingo";
    document.getElementsByClassName("theme-switcher")[0].getElementsByTagName("img")[0].src = "/assets/dark.svg";
  } else {
    document.body.classList.add("dark");
    document.getElementsByClassName("logo")[0].getElementsByTagName("img")[0].src = "/assets/logo_dark.webp";
    document.getElementsByClassName("logo")[0].getElementsByTagName("span")[0].innerText = "Ewiv Bingo";
    document.getElementsByClassName("theme-switcher")[0].getElementsByTagName("img")[0].src = "/assets/light.svg";
  }

  darkTheme = !darkTheme;

  localStorage.setItem("theme", darkTheme ? "dark" : "light");
}

if (darkModeDefault) switchTheme();

document.getElementsByClassName("theme-switcher")[0].addEventListener("click", () => switchTheme());
