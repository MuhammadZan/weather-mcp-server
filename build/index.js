import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import cors from "cors";
import express from "express";
const app = express();
app.use(cors());
app.use(express.json());
const OPENWEATHER_API_BASE = "https://api.openweathermap.org/data/2.5";
const API_KEY = "4a9110348fb6b877c589ee1216cb7b45";
// Helper function for making OpenWeatherMap API requests
async function makeOpenWeatherRequest(endpoint, params = {}) {
    if (!API_KEY) {
        throw new Error("OPENWEATHER_API_KEY environment variable is required");
    }
    const url = new URL(`${OPENWEATHER_API_BASE}${endpoint}`);
    url.searchParams.set('appid', API_KEY);
    url.searchParams.set('units', 'metric'); // Use metric units
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json());
    }
    catch (error) {
        console.error("Error making OpenWeatherMap request:", error);
        return null;
    }
}
// Create server instance with weather tools
function getServer() {
    const server = new McpServer({
        name: "weather",
        version: "1.0.0",
    });
    // Register weather tools
    server.tool("get-current-weather", "Get current weather for a city", {
        city: z.string().describe("City name (e.g. London, New York, Tokyo)"),
    }, async ({ city }) => {
        const weatherData = await makeOpenWeatherRequest("/weather", { q: city });
        if (!weatherData) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve weather data for ${city}. Please check the city name and try again.`,
                    },
                ],
            };
        }
        const weather = weatherData.weather[0];
        const main = weatherData.main;
        const wind = weatherData.wind;
        const weatherText = [
            `🌤️ Current Weather in ${weatherData.name}, ${weatherData.sys.country}:`,
            `Temperature: ${main.temp}°C (feels like ${main.feels_like}°C)`,
            `Weather: ${weather.description}`,
            `Humidity: ${main.humidity}%`,
            `Pressure: ${main.pressure} hPa`,
            `Wind: ${wind.speed} m/s at ${wind.deg}°`,
            `Coordinates: ${weatherData.coord.lat}, ${weatherData.coord.lon}`,
        ].join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: weatherText,
                },
            ],
        };
    });
    server.tool("get-weather-forecast", "Get 5-day weather forecast for a city", {
        city: z.string().describe("City name (e.g. London, New York, Tokyo)"),
    }, async ({ city }) => {
        const forecastData = await makeOpenWeatherRequest("/forecast", { q: city });
        if (!forecastData) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve forecast data for ${city}. Please check the city name and try again.`,
                    },
                ],
            };
        }
        const forecasts = forecastData.list.slice(0, 8); // Get next 24 hours (3-hour intervals)
        const forecastText = [
            `📅 5-Day Forecast for ${forecastData.city.name}, ${forecastData.city.country}:`,
            "",
            ...forecasts.map((forecast) => {
                const date = new Date(forecast.dt * 1000);
                const weather = forecast.weather[0];
                return [
                    `🕐 ${date.toLocaleString()}:`,
                    `   Temperature: ${forecast.main.temp}°C (feels like ${forecast.main.feels_like}°C)`,
                    `   Weather: ${weather.description}`,
                    `   Humidity: ${forecast.main.humidity}%`,
                    `   Wind: ${forecast.wind.speed} m/s`,
                    "",
                ].join("\n");
            }),
        ].join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: forecastText,
                },
            ],
        };
    });
    return server;
}
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "healthy", server: "weather-mcp" });
});
app.post('/mcp', async (req, res) => {
    // In stateless mode, create a new instance of transport and server for each request
    // to ensure complete isolation. A single instance would cause request ID collisions
    // when multiple clients connect concurrently.
    try {
        const server = getServer();
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        res.on('close', () => {
            console.log('Request closed');
            transport.close();
            server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});
// SSE notifications not supported in stateless mode
app.get('/mcp', async (req, res) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});
// Session termination not needed in stateless mode
app.delete('/mcp', async (req, res) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});
// Start the server
const PORT = 3000;
app.listen(PORT, (error) => {
    if (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
    console.log(`Weather MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});
