# Contributing to Subsume

First off, thank you for considering contributing to Subsume! It's people like you that make Subsume such a great tool for cinephiles.

## Development Setup

1. Fork and clone the repository.
2. Ensure you have Node.js 18+ installed.
3. Run `npm install` to install dependencies.
4. Run `npm run dev` to start the build in watch mode.

To load the extension into Chrome:
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` directory from your cloned repository.

## Testing

Please ensure all tests pass before submitting a pull request:
```bash
npm run test
```

## Pull Request Process

1. Ensure any new code includes appropriate tests and documentation.
2. Update the README.md with details of changes to the interface, new features, or setup instructions if applicable.
3. Ensure your commits are descriptive and follow standard conventional commit formats.
4. Open a Pull Request against the `main` branch.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.
