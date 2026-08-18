/**
 * ENHANCED CODE PARSER
 * Handles multiple GPT response formats
 */

import axios from 'axios';

/**
 * Parse GPT's code response - handles multiple formats
 */
function parseCodeResponse(gptResponse) {
  console.log('\n🔍 ===== PARSING CODE RESPONSE =====');
  console.log(`📏 Response length: ${gptResponse.length} characters\n`);
  
  const files = [];
  
  // Method 1: ### filepath format (primary format)
  console.log('📋 Method 1: Parsing ### filepath format...');
  const method1Files = extractTripleHashFormat(gptResponse);
  files.push(...method1Files);
  console.log(`  ✅ Found ${method1Files.length} files`);
  
  // Method 2: Code blocks with paths
  console.log('📋 Method 2: Parsing code blocks with paths...');
  const method2Files = extractCodeBlocksWithPaths(gptResponse);
  files.push(...method2Files);
  console.log(`  ✅ Found ${method2Files.length} files`);
  
  // Method 3: Structured file blocks
  console.log('📋 Method 3: Parsing structured blocks...');
  const method3Files = extractStructuredFileBlocks(gptResponse);
  files.push(...method3Files);
  console.log(`  ✅ Found ${method3Files.length} files`);
  
  // Remove duplicates and validate
  const uniqueFiles = deduplicateFiles(files);
  const validFiles = validateFiles(uniqueFiles);
  
  console.log(`\n✅ Total unique files: ${uniqueFiles.length}`);
  console.log(`✅ Valid files: ${validFiles.length}`);
  console.log('===================================\n');
  
  if (validFiles.length === 0) {
    console.error('❌ NO VALID FILES EXTRACTED!');
    console.log('\n📄 Response preview (first 2000 chars):');
    console.log(gptResponse.substring(0, 2000));
    throw new Error('No valid files could be extracted from GPT response');
  }
  
  return validFiles;
}

/**
 * Method 1: Extract ### filepath format
 * Example:
 * ### package.json
 * { "name": "test" }
 */
function extractTripleHashFormat(response) {
  const files = [];
  const sections = response.split(/^###\s+/gm);
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const filepath = lines[0].trim();
    
    // Get code (everything after the first line)
    let code = lines.slice(1).join('\n').trim();
    
    // Remove markdown code blocks if present
    code = code.replace(/^```[\w]*\n?/gm, '');
    code = code.replace(/\n?```$/gm, '');
    code = code.trim();
    
    if (filepath && code && code.length > 10) {
      files.push({ filepath, code });
    }
  }
  
  return files;
}

/**
 * Method 2: Extract code blocks with file paths
 */
function extractCodeBlocksWithPaths(response) {
  const files = [];
  
  // Pattern 1: ```language:filepath
  const pattern1 = /```[\w]*:([^\n]+)\n([\s\S]*?)```/g;
  let match;
  
  while ((match = pattern1.exec(response)) !== null) {
    const filepath = match[1].trim();
    const code = match[2].trim();
    if (filepath && code) {
      files.push({ filepath, code });
    }
  }
  
  // Pattern 2: Comment before code block
  const pattern2 = /(?:\/\/|#)\s*(?:File|Path):\s*([^\n]+)\n```[\w]*\n([\s\S]*?)```/gi;
  while ((match = pattern2.exec(response)) !== null) {
    const filepath = match[1].trim();
    const code = match[2].trim();
    if (filepath && code) {
      files.push({ filepath, code });
    }
  }
  
  // Pattern 3: Header before code block
  const pattern3 = /#{1,6}\s+([^\n]+\.[a-zA-Z0-9]+)\s*\n```[\w]*\n([\s\S]*?)```/g;
  while ((match = pattern3.exec(response)) !== null) {
    const filepath = match[1].trim();
    const code = match[2].trim();
    if (filepath && code && (filepath.includes('/') || filepath.includes('.'))) {
      files.push({ filepath, code });
    }
  }
  
  return files;
}

/**
 * Method 3: Extract structured file blocks
 */
function extractStructuredFileBlocks(response) {
  const files = [];
  const pattern = /\*\*(?:File|Path):\s*`?([^`\n*]+?)`?\*\*\s*\n```[\w]*\n([\s\S]*?)```/gi;
  let match;
  
  while ((match = pattern.exec(response)) !== null) {
    const filepath = match[1].trim();
    const code = match[2].trim();
    if (filepath && code) {
      files.push({ filepath, code });
    }
  }
  
  return files;
}

/**
 * Remove duplicate files (keep longest code)
 */
function deduplicateFiles(files) {
  const fileMap = new Map();
  
  for (const file of files) {
    const normalizedPath = file.filepath
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .toLowerCase();
    
    if (!fileMap.has(normalizedPath)) {
      fileMap.set(normalizedPath, file);
    } else {
      const existing = fileMap.get(normalizedPath);
      if (file.code.length > existing.code.length) {
        fileMap.set(normalizedPath, file);
      }
    }
  }
  
  return Array.from(fileMap.values());
}

/**
 * Validate files
 */
function validateFiles(files) {
  return files.filter(file => {
    // Must have filepath
    if (!file.filepath || typeof file.filepath !== 'string') {
      console.warn('  ⚠️ Skipping: missing filepath');
      return false;
    }
    
    // Must have code
    if (!file.code || typeof file.code !== 'string' || file.code.length < 10) {
      console.warn(`  ⚠️ Skipping ${file.filepath}: no valid content`);
      return false;
    }
    
    // Must have file extension
    if (!/\.[a-zA-Z0-9]{1,10}$/.test(file.filepath)) {
      console.warn(`  ⚠️ Skipping ${file.filepath}: no file extension`);
      return false;
    }
    
    return true;
  });
}

/**
 * Clean and normalize file paths
 */
function cleanFilePath(filepath, repoName = '') {
  let cleaned = filepath.trim();
  
  // Remove quotes
  cleaned = cleaned.replace(/['"]/g, '');
  
  // Convert backslashes to forward slashes
  cleaned = cleaned.replace(/\\/g, '/');
  
  // Remove repo name prefix if present
  if (repoName) {
    const repoPrefix = new RegExp(`^${repoName}/`, 'i');
    cleaned = cleaned.replace(repoPrefix, '');
  }
  
  // Remove leading slashes
  cleaned = cleaned.replace(/^\/+/, '');
  
  return cleaned;
}


/**
 * Display file structure as a tree
 */
function logFileStructure(files, logFn = console.log) {
  logFn('\n📂 ===== FILE STRUCTURE =====');
  
  const tree = {};
  files.forEach(file => {
    const parts = file.filepath.split('/');
    let current = tree;
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        if (!current._files) current._files = [];
        current._files.push(part);
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
  });
  
  function printTree(node, prefix = '', isLast = true) {
    const dirs = Object.keys(node).filter(k => k !== '_files');
    const files = node._files || [];
    
    dirs.forEach((dir, index) => {
      const isLastDir = index === dirs.length - 1 && files.length === 0;
      const connector = isLastDir ? '└── ' : '├── ';
      const newPrefix = prefix + (isLastDir ? '    ' : '│   ');
      
      logFn(`${prefix}${connector}📁 ${dir}/`);
      printTree(node[dir], newPrefix, isLastDir);
    });
    
    files.forEach((file, index) => {
      const isLastFile = index === files.length - 1;
      const connector = isLastFile ? '└── ' : '├── ';
      logFn(`${prefix}${connector}📄 ${file}`);
    });
  }
  
  printTree(tree);
  logFn('============================\n');
}

export {
  parseCodeResponse,
  cleanFilePath,
  logFileStructure,
  validateFiles
};