import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const LOCATIONS = {
  nesna: { name: "Nesna", lat: 66.1958312, lon: 13.0199956 },
  // legg til flere om du vil:
  // "mo-i-rana": { name:"Mo i Rana", lat: 66.3137122, lon: 14.1419749 },
  // sandnessjoen: { name:"Sandnessjøen", lat: 66.0215534, lon: 12.6314628 },
};



const app = express();

// Start med å tillate alle (for test). Stram inn senere til elev-domene.
app.use(cors({ origin: "*" }));

// Enkel in-memory cache for å unngå mange Graph-kall
let cache = { expires: 0, data: null };

async function getAccessToken() {
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(`Token error: ${JSON.stringify(json)}`);

  return json.access_token;
}

function utcRangeForToday() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return { start, end };
}

app.get("/api/today", async (req, res) => {
  try {
    // cache i 60 sek
    const now = Date.now();
    if (cache.data && cache.expires > now) {
      return res.json(cache.data);
    }

    const calendarUser = process.env.CALENDAR_USER;
    if (!calendarUser) return res.status(500).json({ error: "Missing CALENDAR_USER" });

    const accessToken = await getAccessToken();
    const { start, end } = utcRangeForToday();

    const url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(calendarUser)}/calendarView` +
      `?startDateTime=${encodeURIComponent(start.toISOString())}` +
      `&endDateTime=${encodeURIComponent(end.toISOString())}` +
      `&$select=subject,start,end,location,isAllDay`;

    const graphResp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="Europe/Oslo"',
      },
    });

    const graphJson = await graphResp.json();
    if (!graphResp.ok) return res.status(500).json(graphJson);

    const events = (graphJson.value || [])
      .sort((a, b) => (a.start?.dateTime || "").localeCompare(b.start?.dateTime || ""))
      .map((e) => ({
        subject: e.subject || "",
        start: e.start?.dateTime || "",
        end: e.end?.dateTime || "",
        location: e.location?.displayName || "",
        isAllDay: !!e.isAllDay,
      }));

    const payload = {
      date: new Date().toISOString().slice(0, 10),
      events,
    };

    cache = { data: payload, expires: Date.now() + 60_000 };
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});


app.get("/api/weather/:location", async (req, res) => {
  try {
    const key = (req.params.location || "").toLowerCase();
    const loc = LOCATIONS[key];

    if (!loc) {
      return res.status(404).json({
        error: "Unknown location",
        allowed: Object.keys(LOCATIONS),
        hint: "Example: /api/weather/nesna",
      });
    }

    // Vi henter "current" (nå) + dagens min/max via daily
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${loc.lat}` +
      `&longitude=${loc.lon}` +
      "&timezone=Europe%2FOslo" +
      "&current=temperature_2m,precipitation,wind_speed_10m,weather_code" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum";

    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) return res.status(500).json(data);

    // Ryddig, elev-vennlig respons
    res.json({
      location: loc.name,
      date: data.daily?.time?.[0] || null,
      current: data.current || null,
      today: data.daily
        ? {
            tempMax: data.daily.temperature_2m_max?.[0],
            tempMin: data.daily.temperature_2m_min?.[0],
            precipitationSum: data.daily.precipitation_sum?.[0],
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});


const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
