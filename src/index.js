import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import axios from "axios";
import express from "express";
import cors from "cors";

// Create Express app for additional endpoints
const app = express();
app.use(cors());
app.use(express.json());

const server = new McpServer({
    name: "weather_mcp_server",
    version: "1.0.0",
});

// Enhanced weather tool
server.tool(
    "get-weather", 
    "Get current weather information for any city",
    { 
        city: z.string().describe("The city name to get weather information for") 
    },
    async ({ city }) => {
        try {
            const API_KEY = process.env.OPENWEATHER_API_KEY;
            if (!API_KEY) {
                throw new Error("OpenWeather API key not configured");
            }

            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`,
                { timeout: 10000 }
            );

            const data = response.data;
            const weatherInfo = {
                city: data.name,
                country: data.sys.country,
                temperature: Math.round(data.main.temp),
                feels_like: Math.round(data.main.feels_like),
                humidity: data.main.humidity,
                description: data.weather[0].description,
                wind_speed: data.wind.speed,
                pressure: data.main.pressure,
                visibility: data.visibility ? Math.round(data.visibility / 1000) : null
            };

            return {
                content: [
                    {
                        type: "text",
                        text: `Current weather in ${weatherInfo.city}, ${weatherInfo.country}:

                            Temperature: ${weatherInfo.temperature}°C (feels like ${weatherInfo.feels_like}°C)
                            Condition: ${weatherInfo.description}
                            Humidity: ${weatherInfo.humidity}%
                            Wind Speed: ${weatherInfo.wind_speed} m/s
                            Pressure: ${weatherInfo.pressure} hPa${weatherInfo.visibility ? `\n Visibility: ${weatherInfo.visibility} km` : ''}`
                    }
                ]
            };
        } catch (error) {
            console.error("Weather API Error:", error.message);
            
            if (error.response?.status === 404) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `City "${city}" not found. Please check the spelling and try again.`
                        }
                    ]
                };
            }
            
            if (error.code === 'ECONNABORTED') {
                return {
                    content: [
                        {
                            type: "text",
                            text: `⏱Request timeout. Weather service is slow, please try again.`
                        }
                    ]
                };
            }
            
            return {
                content: [
                    {
                        type: "text",
                        text: `Unable to fetch weather data for ${city}. Please try again later.`
                    }
                ]
            };
        }
    }
);

// MCP Server manifest endpoint
app.get('/mcp.json', (req, res) => {
    res.json({
        name: "weather_mcp_server",
        version: "1.0.0",
        description: "Get current weather information for any city worldwide",
        author: "Your Name",
        license: "MIT",
        server: {
            type: "http",
            url: `https://${req.get('host')}`
        },
        tools: [
            {
                name: "get-weather",
                description: "Get current weather information for any city",
                inputSchema: {
                    type: "object",
                    properties: {
                        city: {
                            type: "string",
                            description: "The city name to get weather information for"
                        }
                    },
                    required: ["city"]
                }
            }
        ],
        capabilities: ["tools"],
        endpoints: {
            tools: "/tools",
            health: "/health",
            manifest: "/mcp.json"
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        server: 'weather_mcp_server',
        version: '1.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: "Weather MCP Server",
        version: "1.0.0",
        endpoints: {
            manifest: "/mcp.json",
            health: "/health",
            tools: "/tools"
        }
    });
});

// Configure MCP transport
const transporter = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    allowedHosts: [
        "localhost", 
        "127.0.0.1",
        "api.openai.com",
        "openai.com",
        "*.openai.com",
        "chat.openai.com"
    ]
});

// Connect MCP server
server.connect(transporter);

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Weather MCP Server running on port ${PORT}`);
    console.log(`Server URL: http://localhost:${PORT}`);
    console.log(`Manifest: http://localhost:${PORT}/mcp.json`);
    console.log(`Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down Weather MCP server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down Weather MCP server...');
    process.exit(0);
});