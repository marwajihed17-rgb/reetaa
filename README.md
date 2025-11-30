# PAA Solutions Tool

A modern web application for Invoice Processing, KDR Processing, and GA Processing with Google Sheets integration and real-time chat functionality.

## Features

- 🔐 **Secure Authentication** - Login system backed by Google Sheets database
- 📊 **Invoice Processing** - Automated invoice handling and processing
- 📦 **KDR Processing** - Efficient KDR workflow management
- 📈 **GA Processing** - Analytics and reporting automation
- 💬 **Real-time Chat** - Interactive messaging interface for all processing modules
- ☁️ **Cloud Database** - Google Sheets integration for data storage
- 🎨 **Modern UI** - Beautiful gradient design with animated components

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Backend**: Vercel Serverless Functions
- **Database**: Google Sheets (CSV export)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Google Sheet set up with your data
- A Vercel account (free tier works)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd reetaa
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your Google Sheets URL:
   ```env
   GOOGLE_SHEET_URL=your-google-sheet-csv-url
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

### Google Sheets Setup

To use Google Sheets as your database:

1. **Create a Google Sheet** with the following structure for users:

   | username | password | role | email |
   |----------|----------|------|-------|
   | admin    | admin123 | admin| admin@example.com |
   | user1    | pass123  | user | user1@example.com |

2. **Publish the sheet to the web**:
   - Go to **File** → **Share** → **Publish to web**
   - Select **Entire Document**
   - Choose **Comma-separated values (.csv)** format
   - Click **Publish**
   - Copy the generated URL

3. **Add the URL to your environment variables**:
   - Update `GOOGLE_SHEET_URL` in your `.env` file
   - For Vercel deployment, add it to your Vercel project settings

## Deployment to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual Deployment

1. **Install Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

   Or push to your Git repository and connect it to Vercel.

### Environment Variables on Vercel

After deploying, add the following environment variables in your Vercel project settings:

1. Go to your project on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

   | Name | Value |
   |------|-------|
   | `GOOGLE_SHEET_URL` | Your Google Sheets CSV export URL |
   | `VITE_API_BASE_URL` | `/api` |
   | `VITE_APP_NAME` | `PAA Solutions Tool` |
   | `VITE_APP_URL` | `https://www.paa-solutions.com` |

4. Click **Save** and redeploy your project

## Project Structure

```
reetaa/
├── api/                      # Vercel serverless functions
│   ├── auth.ts              # Authentication API
│   ├── sheets.ts            # Google Sheets data API
│   └── messages.ts          # Message handling API
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx
│   │   ├── LoginPage.tsx
│   │   ├── InvoiceProcessing.tsx
│   │   ├── KDRProcessing.tsx
│   │   ├── GAProcessing.tsx
│   │   └── ui/             # UI components (shadcn)
│   ├── services/           # API services
│   │   └── api.ts          # API client
│   ├── types/              # TypeScript types
│   │   └── api.ts          # API response types
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── .env.example            # Environment variables template
├── vercel.json             # Vercel configuration
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies

```

## API Endpoints

### Authentication
- `POST /api/auth` - Authenticate user with username and password
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```

### Google Sheets
- `GET /api/sheets` - Fetch all data from Google Sheets

### Messages
- `POST /api/messages` - Send a new message
  ```json
  {
    "text": "Hello",
    "sender": "user",
    "category": "invoice",
    "userId": "admin"
  }
  ```
- `GET /api/messages?category=invoice&userId=admin` - Retrieve messages

## Build Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking

## Configuration

### Vercel Configuration

The `vercel.json` file contains:
- Build settings (output directory, framework)
- API route rewrites
- CORS headers for API endpoints

### Vite Configuration

The `vite.config.ts` includes:
- React plugin with SWC
- Path aliases
- Build optimizations
- Development server settings

## Customization

### Update Branding

To customize the branding:

1. Update logo in `src/assets/`
2. Modify colors in component files (search for hex colors like `#4A90F5`, `#C74AFF`)
3. Update application name in environment variables
4. Change footer signature in `Dashboard.tsx` and `LoginPage.tsx`

### Add New Processing Modules

1. Create a new component in `src/components/`
2. Add route in `src/App.tsx`
3. Add card in `Dashboard.tsx`
4. Update API endpoints if needed

## Security Notes

⚠️ **Important**: The current authentication implementation is basic and suitable for internal tools. For production use:

- Implement proper password hashing (bcrypt, argon2)
- Use HTTPS for all communications
- Add JWT token validation
- Implement rate limiting
- Use environment-specific secrets
- Consider using a proper database instead of Google Sheets for sensitive data

## Troubleshooting

### Build Fails
- Check that all dependencies are installed: `npm install`
- Verify Node.js version: `node -v` (should be 18+)
- Clear cache: `rm -rf node_modules dist && npm install`

### Authentication Not Working
- Verify Google Sheets URL is correct and publicly accessible
- Check that the sheet has the correct column headers (username, password)
- Ensure environment variables are set correctly

### API Routes Not Working on Vercel
- Verify `vercel.json` is properly configured
- Check Vercel function logs in the dashboard
- Ensure environment variables are set in Vercel project settings

## Support

For issues and questions:
- Check the [Issues](https://github.com/your-repo/issues) page
- Visit [PAA Solutions](https://www.paa-solutions.com)

## License

[Your License Here]

---

**Built with ❤️ by PAA Solutions**
