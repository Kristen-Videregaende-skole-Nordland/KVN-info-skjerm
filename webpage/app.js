const loactionName = document.querySelector('.locationName');
const temp = document.querySelector('.temp');
const wpic = document.querySelector(".wpic")

function setWeatherDate(data) {
    loactionName.textContent = data.location;
    temp.textContent = data.current.temperature_2m + '°C';
    console.log(data.current.temperature_2m);
}


async function getWeather() {
    const data = await fetch('http://localhost:3000/api/weather/nesna');
    const json = await data.json();
    console.log(json);
    setWeatherDate(json);
    simplifyWeather(json.current.weather_code)
    kmhToMs(json.current.wind_speed_10m)
    rotateArrow(json.current.wind_direction_10m)
    
}

async function getCalender() {
    const data = await fetch('http://localhost:3000/api/today');
    const json = await data.json();
    console.log(json);
}


function simplifyWeather(code){
  if ([0, 1].includes(code)) wpic.src = "pic/w_code/1.png"; // Klarvær
  if ([2, 3].includes(code)) wpic.src = "pic/w_code/2.png"; // Skyet
  if ([45, 48].includes(code)) wpic.src = "pic/w_code/3.png"; // Tåke
  if ([51, 53, 61, 80].includes(code)) wpic.src = "pic/w_code/4.png"; // Litt regn
  if ([55, 63, 65, 81, 82].includes(code)) wpic.src = "pic/w_code/5.png"; // Mye regn
  if ([71, 73, 85].includes(code)) wpic.src = "pic/w_code/6.png"; // Litt snø
  if ([75, 77, 86].includes(code)) wpic.src = "pic/w_code/7.png"; // Mye snø
  if ([95, 96, 99].includes(code)) wpic.src = "pic/w_code/8.png"; // Tordenvær
  return 0; // Ukjent
}

function kmhToMs(kmh) {
    console.log(Number((kmh / 3.6).toFixed(0)))
    const ms = document.getElementById("ms");
    ms.innerHTML = `${Number((kmh / 3.6).toFixed(0))}/ms`
}


function rotateArrow(degrees) {
  const arrow = document.getElementById("arrow");
  arrow.style.transform = `rotate(${degrees}deg)`;
}


getWeather();
getCalender()

