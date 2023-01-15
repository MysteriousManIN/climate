"use strict";

$(()=>{
    
    const _fetch = async (url) => { return await (await fetch(url)).json(); };

    const API_KEY = "3d41c81e06e54f5c86924343222708", BASE_URL = "https://api.weatherapi.com/v1/";
    const AQI_UsEpaIndex = [ "Good", "Moderate", "Unhealthy for sensitive groups", "Unhealthy", "Very unhealthy", "Hazardous" ];
    const weatherAPIs = {
        search: (q) =>{ return _fetch(BASE_URL + `search.json?key=${API_KEY}&q=${q}`); },
        forecast : (location, date) => { return _fetch(BASE_URL + `forecast.json?key=${API_KEY}&aqi=yes&q=${location}&dt=${date}`); }
    };
    
	const dateList = (nod = 1) => { // nod = number of days

        const date = new Date();
        let i, list = [];

        for(i = 0 ; i < nod ; i++){

            let [ m, d, y ] = [ date.getMonth() + 1, date.getDate(), date.getFullYear() ];

            m = m < 10 ? "0" + m : m;
            d = d < 10 ? "0" + d : d;

            list.push(`${y}-${m}-${d}`);
            date.setDate(date.getDate() + 1);

        }

        return list;

    };

    const simplifyDateTime = (dt) => { // dt = YYYY-MM-DD HH:MM:SS

        dt = new Date(dt);
    
        let [ ds, ms, d, y, t ] = dt.toString().split(" "), [ h, m ] = t.split(":"), hh = parseInt(h);

        hh = hh > 12 ? hh - 12 : hh;
        hh = hh < 10 ? "0" + hh : hh;

        return {
            date: d,
            year: y,
            hours: hh,
            minutes: m,
            day_shortname: ds,
            month_shortname: ms,
            am_pm: h >= 12 ? "PM" : "AM"
        };
    
    };

    async function loadWeatherData(place, days){

        let weather = [];
        dateList(days).forEach(date => { weather.push(weatherAPIs.forecast(place, date)); });

        let weather_data = await Promise.all(weather).then(all_res => {

            let data = { current: null, forecastdays: {}, location: null };
            all_res.forEach(res => {
                let { current, forecast, location } = res;
                data.current = current;
                data.location = location;
                data.forecastdays[forecast.forecastday[0].date] = forecast.forecastday[0];
            });
            
            return data;

        });

        return weather_data;

    }

    function displayCurrentWeather(location, current){

        let { country, name, region } = location,
            { temp_c, feelslike_c, last_updated, humidity, precip_mm, uv, wind_dir, wind_kph, cloud, vis_km } = current,
            { icon, text } = current.condition,
            { "us-epa-index":us_epa_index, pm2_5, pm10 } = current.air_quality,
            { hours, minutes, am_pm  } = simplifyDateTime(last_updated);

        icon = "https:" + icon.replace("64x64", "128x128");
        temp_c = Math.round(temp_c);
        pm2_5 = pm2_5.toFixed(2);
        pm10 = pm10.toFixed(2);

        let cw_details = {
            "Humidity": humidity + " %",
            "Precip": precip_mm + " mm",
            "Wind speed": wind_kph + " kph",
            "Wind direction": wind_dir,
            "UV": uv,
            "Cloud": cloud + " %",
            "Vision": vis_km + " km" 
        };

        $("#main-location").text(name);
        $("#sub-super-location").text(`${region}, ${country}`);
        $("#cw-img").css({ "background-image": `url(${icon})` });
        $("#cw-temp").text(temp_c);
        $("#cw-name").text(text);
        $("#cw-feelslike").text(feelslike_c);
        $("#cw-time").text(`Today, ${hours}:${minutes} ${am_pm}`);

        $("#cw-details").html("");
        Object.keys(cw_details).forEach(key => {
            $("#cw-details").append(
                $("<div>").append(
                    $("<span>").html(cw_details[key]),
                    $("<span>").text(key)
                )
            );
        });

        $("#aqi-meter").val(us_epa_index);
        $("#aqi-label").text(AQI_UsEpaIndex[us_epa_index - 1]);
        $("#aqi-pm2_5").text(pm2_5);
        $("#aqi-pm10").text(pm10);

    }

    function displayDayHourForecast(forecast){

        let { astro, hour } = forecast,
            { sunrise, sunset, moonrise, moonset } = astro;

        $("#sunrise").text(sunrise);
        $("#sunset").text(sunset);
        $("#moonrise").text(moonrise);
        $("#moonset").text(moonset);

        const hourlyForecast = (hour_index) => {

            let { temp_c, humidity, precip_mm, wind_kph, wind_dir, uv, cloud, vis_km, feelslike_c, chance_of_rain, chance_of_snow, condition, time } = hour[hour_index],
                { icon, text } = condition,
                { day_shortname, month_shortname, date, hours, minutes, am_pm  } = simplifyDateTime(time);

            icon = icon.replace("64x64", "128x128");

            let dhf_details = {
                "Humidity": humidity + " %",
                "Precip": precip_mm + " mm",
                "Wind speed": wind_kph + " kph",
                "Wind direction": wind_dir,
                "UV": uv,
                "Cloud": cloud + " %",
                "Vision": vis_km + " km" 
            };

            let dhf_details_1 = {
                "Sunrise": sunrise,
                "Sunset": sunset,
                "Moonrise": moonrise,
                "Moonset": moonset,
                "Rain chance": chance_of_rain + " %",
                "Snow chance": chance_of_snow + " %",
            };

            $("#dhf-datetime").text(`At ${day_shortname}, ${month_shortname} ${date}, ${hours}:${minutes} ${am_pm}`);
            $("#dhf-img").css({ "background-image": `url(${icon})` });
            $("#dhf-temp").text(temp_c);
            $("#dhf-name").text(text);
            $("#dhf-feelslike").text(feelslike_c);

            $("#dhf-details").html("");
            Object.keys(dhf_details).forEach(key => {
                $("#dhf-details").append(
                    $("<div>").append(
                        $("<span>").html(dhf_details[key]),
                        $("<span>").text(key)
                    )
                );
            });

            $("#dhf-details-1").html("<div></div>");
            Object.keys(dhf_details_1).forEach(key => {
                $("#dhf-details-1").append(
                    $("<div>").append(
                        $("<span>").html(dhf_details_1[key]),
                        $("<span>").text(key)
                    )
                );
            });

        };

        let current_hour =  new Date().getHours();
        const changeHourRangeBG = (val) => {
            $("#hour-range").css({ "background-image": `linear-gradient(to right, var(--c_2) ${val*100/23}%, transparent 0%)` });
        };

        $("#hour-range").val(current_hour)
        changeHourRangeBG(current_hour);
        hourlyForecast(current_hour);

        $("#hour-range").on("input", () => {
            let val = $("#hour-range").val();
            changeHourRangeBG(val);
            hourlyForecast(val);
        });

    }

    function displayDayCards(forecastdays, days){

        $("#day-cards").html("");

        dateList(days).forEach(date => {

            let { mintemp_c, maxtemp_c, condition } = forecastdays[date].day,
                { icon } = condition,
                { month_shortname, date:datex } = simplifyDateTime(date);

            icon = icon.replace("64x64", "128x128");
            mintemp_c = Math.round(mintemp_c);
            maxtemp_c = Math.round(maxtemp_c);

            const card = $("<button>", { type:"button" });

            card.append(
                $("<span>").text(`${datex} ${month_shortname}`),
                $("<div>", { class:"weather-img" }).css({ "background-image": `url(${icon})` }),
                $("<span>").text(`${mintemp_c}/${maxtemp_c}`)
            );

            card.on("click", () => {

                $("#day-cards > button.active").removeClass("active");
                card.addClass("active");
                displayDayHourForecast(forecastdays[date]);

            });

            $("#day-cards").append(card);

        });

        $("#day-cards > button:first-child").addClass("active");

    }

    async function displayWeather(place, days = 7){

        showPreFetching(true);

        const { current, location, forecastdays } = await loadWeatherData(place, days);
        const today_date = dateList(1)[0];

        displayCurrentWeather(location, current); 
        displayDayHourForecast(forecastdays[today_date]);
        displayDayCards(forecastdays, days);

        showPreFetching(false);

    }

    async function searchLocation(query){

        return await weatherAPIs.search(query);

    }

    function showPreFetching(b){

        let div = $("<div>", { class:"prefetching" }).append($("<span>").text("Fetching"));
        b ? $("#nav-bar").after(div) : $("#nav-bar + .prefetching").remove();

    }

    for(let i = 0 ; i < 24 ; i+=1){
        let label = i === 0 ? 12 : i > 12 ? i - 12 : i;
        if(i % 3 === 0) $("#hour-range-box > div").append($("<span>", { label:label }));
        else $("#hour-range-box > div").append($("<span>"));
    }

    let searching;
    $("#search-bar > input").on("input", () => {

        let val = $("#search-bar > input").val().trim();

        window.clearTimeout(searching);
        if(val.length > 2){
            searching = window.setTimeout(async ()=>{

                $("#search-bar > button").addClass("fetching");
                let res = await searchLocation(val);

                $("#search-bar > div").html("");
                res.forEach(place => {

                    let { name, country, region, url } = place;

                    const div = $("<div>").append(
                        $("<span>").text(name),
                        $("<span>").text(`${region} ${country}`)
                    );

                    div.on("click", ()=>{
                        displayWeather(url, 7);
                        $("#search-bar > button").click();
                    });

                    $("#search-bar > div").append(div);

                });

                $("#search-bar > div").addClass("result");
                $("#search-bar > button").removeClass("fetching");

            }, 500);
        }else{

            $("#search-bar > div").html(""); 
            $("#search-bar > div").removeClass("result");
            $("#search-bar > button").removeClass("fetching");

        }

    });

    $("#search-bar > button").on("click", (e) => {

        $("#search-bar > button").parent().toggleClass("active");
        $("#search-bar > button").removeClass("fetching");

        if($("#search-bar > button").parent().hasClass("active")){
            $("#search-bar > input").val("");
            $("#search-bar > div").html(""); 
            $("#search-bar > div").removeClass("result");
        }

    });

    $(window).on("scroll", (e) => {
        let percent = (window.scrollY * 100) / (document.body.scrollHeight - visualViewport.height);
        $(".website-name").css({ "background-image": `linear-gradient(to right, var(--c_5) ${percent}%, transparent 0%)` });
    });

    displayWeather("Mathura", 6);

});

(()=>{

    window.addEventListener("load", ()=>{
        document.querySelector(".preloader").remove();
    });

})();