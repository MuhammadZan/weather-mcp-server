import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import cors from "cors";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

const OPENWEATHER_API_BASE = "https://api.openweathermap.org/data/2.5";
const API_KEY = "4a9110348fb6b877c589ee1216cb7b45";

// Helper function for making OpenWeatherMap API requests
async function makeOpenWeatherRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
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
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making OpenWeatherMap request:", error);
    return null;
  }
}

interface WeatherData {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  coord: {
    lat: number;
    lon: number;
  };
}

interface ForecastData {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    wind: {
      speed: number;
      deg: number;
    };
    dt_txt: string;
  }>;
  city: {
    name: string;
    country: string;
  };
}

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

// Register weather tools
server.tool(
  "get-current-weather",
  "Get current weather for a city",
  {
    city: z.string().describe("City name (e.g. London, New York, Tokyo)"),
  },
  async ({ city }) => {
    const weatherData = await makeOpenWeatherRequest<WeatherData>("/weather", { q: city });

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
  },
);

server.tool(
  "get-weather-forecast",
  "Get 5-day weather forecast for a city",
  {
    city: z.string().describe("City name (e.g. London, New York, Tokyo)"),
  },
  async ({ city }) => {
    const forecastData = await makeOpenWeatherRequest<ForecastData>("/forecast", { q: city });

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
  },
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", server: "weather-mcp" });
});

// MCP endpoint
app.post("/mcp", async (req, res) => {
  console.log("MCP request received");
  try {
    // Set headers for MCP response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Handle MCP protocol requests
    const { method, params } = req.body;

    if (method === 'initialize') {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "weather",
            version: "1.0.0"
          }
        }
      });
    } else if (method === 'tools/list') {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          tools: [
            {
              name: "get-current-weather",
              description: "Get current weather for a city",
              inputSchema: {
                type: "object",
                properties: {
                  city: {
                    type: "string",
                    description: "City name (e.g. London, New York, Tokyo)"
                  }
                },
                required: ["city"]
              }
            },
            {
              name: "get-weather-forecast",
              description: "Get 5-day weather forecast for a city",
              inputSchema: {
                type: "object",
                properties: {
                  city: {
                    type: "string",
                    description: "City name (e.g. London, New York, Tokyo)"
                  }
                },
                required: ["city"]
              }
            }
          ]
        }
      });
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params;

      let result;
      if (name === 'get-current-weather') {
        const weatherData = await makeOpenWeatherRequest("/weather", { q: args.city }) as WeatherData | null;

        if (!weatherData) {
          result = {
            content: [
              {
                type: "text",
                text: `Failed to retrieve weather data for ${args.city}. Please check the city name and try again.`,
              },
            ],
          };
        } else {
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

          result = {
            content: [
              {
                type: "text",
                text: weatherText,
              },
            ],
          };
        }
      } else if (name === 'get-weather-forecast') {
        const forecastData = await makeOpenWeatherRequest("/forecast", { q: args.city }) as ForecastData | null;

        if (!forecastData) {
          result = {
            content: [
              {
                type: "text",
                text: `Failed to retrieve forecast data for ${args.city}. Please check the city name and try again.`,
              },
            ],
          };
        } else {
          const forecasts = forecastData.list.slice(0, 8);

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

          result = {
            content: [
              {
                type: "text",
                text: forecastText,
              },
            ],
          };
        }
      }

      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: result
      });
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        id: req.body.id,
        error: {
          code: -32601,
          message: "Method not found"
        }
      });
    }
  } catch (error) {
    console.error("Error handling MCP request:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id,
      error: {
        code: -32603,
        message: "Internal error"
      }
    });
  }
});


// Start the server
async function main() {
  app.listen(3000, () => console.error("Weather MCP Server running on SSE"));
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});