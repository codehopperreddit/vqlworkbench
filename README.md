# vqlworkbench
# Veeva Vault VQL Query Builder

A web-based tool for building and executing VQL (Vault Query Language) queries against Veeva Vault instances.

## Features

- Modern, responsive UI
- Connect to any Veeva Vault instance
- Build queries with an intuitive interface
- Select fields, apply sorting and filtering
- Execute queries and view results
- Export results to CSV
- Web-based version that can be hosted on GitHub Pages

## Demo

You can access the live demo at [your-github-username.github.io/veeva-vault-vql-webapp](https://your-github-username.github.io/veeva-vault-vql-webapp)

## How to Use

1. **Connection**
   - Enter your Veeva Vault URL, username, and password
   - Click "Connect" to authenticate with your Vault

2. **Building Queries**
   - Select a target object from the dropdown
   - Choose fields from the list (multiple selection supported)
   - Set sorting options (field, direction, nulls handling)
   - Add filter criteria as needed
   - Set output format and options for deleted/archived records
   - Review the generated query or modify it directly

3. **Executing Queries**
   - Click "Query" to execute the query
   - View results in text or table format
   - Export results to a CSV file or copy to clipboard

## Deployment

### Hosting on GitHub Pages

1. Fork this repository
2. Go to the repository settings
3. Navigate to the "Pages" section
4. Select the "main" branch as the source
5. Click "Save"
6. Your app will be available at `https://your-github-username.github.io/veeva-vault-vql-webapp`

### Running Locally

1. Clone the repository:
   ```
   git clone https://github.com/your-github-username/veeva-vault-vql-webapp.git
   ```

2. Navigate to the project directory:
   ```
   cd veeva-vault-vql-webapp
   ```

3. Open `index.html` in your browser or use a local server.

## CORS Considerations

Since this is a web application that makes cross-origin requests to Veeva Vault API, you may encounter CORS (Cross-Origin Resource Sharing) issues. To resolve this:

1. Contact Veeva Support to enable CORS for your Vault domain
2. Specify your GitHub Pages URL (or localhost for testing) as an allowed origin
3. Alternatively, you can use a CORS proxy for development purposes

## Security Considerations

- This application stores credentials in browser localStorage if the "Save credentials" option is checked
- Credentials are stored unencrypted
- All API calls are made directly from the browser
- Consider the security implications before using with production Vaults

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Based on a Python desktop application converted to a web application
- Uses Bootstrap for UI components
- Font Awesome for icons
