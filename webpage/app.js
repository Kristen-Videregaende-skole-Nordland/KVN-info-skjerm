const loactionName = document.querySelector('.locationName');
const temp = document.querySelector('.temp');

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
}

getWeather();

