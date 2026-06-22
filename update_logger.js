const fs = require('fs');

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('console.log') || content.includes('console.warn') || content.includes('console.error')) {
    if (!content.includes('import { logger } from')) {
      // Find the last import statement
      const importMatches = [...content.matchAll(/^import .* from .*;$/gm)];
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const index = lastMatch.index + lastMatch[0].length;
        // Need to resolve the relative path for logger
        const importPath = filePath.includes('/background/') ? '@/shared/logger' : '@/shared/logger';
        content = content.substring(0, index) + `\nimport { logger } from '${importPath}';` + content.substring(index);
      } else {
        content = `import { logger } from '@/shared/logger';\n` + content;
      }
    }
    
    content = content.replace(/console\.log/g, 'logger.log');
    content = content.replace(/console\.warn/g, 'logger.warn');
    content = content.replace(/console\.error/g, 'logger.error');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

updateFile('./src/background/index.ts');
updateFile('./src/content/index.ts');
