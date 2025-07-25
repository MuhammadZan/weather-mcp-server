# Weather MCP Server

A Model Context Protocol (MCP) server that provides weather information through a RESTful API. This server integrates with OpenWeatherMap API to fetch real-time weather data and can be used with AI assistants like Claude.

## 🌟 Features

- **MCP Protocol Support**: Implements the Model Context Protocol for seamless AI integration
- **Weather Data**: Real-time weather information from OpenWeatherMap API
- **RESTful API**: HTTP endpoints for easy integration
- **CORS Support**: Cross-origin resource sharing enabled
- **Error Handling**: Robust error handling and validation
- **TypeScript**: Written in TypeScript for better type safety

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- OpenWeatherMap API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd weather-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   export OPENWEATHER_API_KEY="your-openweather-api-key"
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## 📖 Usage

### Development Mode

Run the server in development mode with auto-restart:

```bash
npm run dev
```

### Production Mode

Run the server in production:

```bash
npm start
```

## 🔧 API Endpoints

### GET /api/weather/:city

Get weather information for a specific city.

**Parameters:**
- `city` (string): The city name to get weather for

**Example Request:**
```bash
curl http://localhost:3000/api/weather/London
```

**Example Response:**
```json
{
  "city": "London",
  "temperature": 15.2,
  "description": "scattered clouds",
  "humidity": 72,
  "windSpeed": 3.6
}
```

### POST /api/mcp

MCP protocol endpoint for AI integration.

**Example Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "get-weather",
    "arguments": {
      "city": "New York"
    }
  }
}
```

## 🛠️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENWEATHER_API_KEY` | Your OpenWeatherMap API key | Yes |
| `PORT` | Server port (default: 3000) | No |

### Getting an OpenWeatherMap API Key

1. Visit [OpenWeatherMap](https://openweathermap.org/)
2. Sign up for a free account
3. Navigate to your API keys section
4. Copy your API key and set it as an environment variable

## 📁 Project Structure

```
weather-mcp-server/
├── src/
│   └── index.js          # Main server file
├── package.json          # Dependencies and scripts
├── README.md            # This file
└── .gitignore           # Git ignore rules
```

## 🔌 MCP Integration

This server implements the Model Context Protocol, making it compatible with AI assistants that support MCP. The server provides a `get-weather` tool that can be called by AI assistants to retrieve weather information.

### Available Tools

- **get-weather**: Retrieves current weather information for a specified city

## 🧪 Testing

Currently, no automated tests are configured. You can test the API manually using curl or any HTTP client.

**Example test:**
```bash
# Test weather endpoint
curl http://localhost:3000/api/weather/Tokyo

# Test MCP endpoint
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"get-weather","arguments":{"city":"Paris"}}}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - For the MCP specification
- [OpenWeatherMap](https://openweathermap.org/) - For weather data API
- [Express.js](https://expressjs.com/) - For the web framework

## 📞 Support

If you encounter any issues or have questions, please:

1. Check the [Issues](https://github.com/yourusername/weather-mcp-server/issues) page
2. Create a new issue with detailed information about your problem
3. Include your Node.js version, operating system, and any error messages

---

**Happy coding! 🌤️** 