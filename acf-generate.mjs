import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

// Configuration
const DIST_DIR = './dist';
const ACF_JSON_DIR = './wp-content/themes/your-theme/acf-json';
const API_KEY = 'your_openai_api_key_here'; // Replace with your agent API key

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function run() {
    try {
        // 1. Scan the dist folder for HTML files
        const files = await fs.readdir(DIST_DIR);
        const htmlFiles = files.filter(file => file.endsWith('.html'));

        if (htmlFiles.length === 0) {
            console.log('No HTML files found in the dist directory.');
            process.exit();
        }

        // 2. List files for user selection
        console.log('\nSelect an HTML file to convert to ACF Flexible Content:\n');
        htmlFiles.forEach((file, index) => {
            console.log(`[${index + 1}] ${file}`);
        });

        const answer = await question('\nEnter the number of the file: ');
        const selectedIndex = parseInt(answer) - 1;

        if (isNaN(selectedIndex) || !htmlFiles[selectedIndex]) {
            console.log('Invalid selection.');
            process.exit();
        }

        const selectedFile = htmlFiles[selectedIndex];
        const htmlContent = await fs.readFile(path.join(DIST_DIR, selectedFile), 'utf-8');

        console.log(`\nCompiling prompt for ${selectedFile}...`);

        // 3. Compile the Prompt Payload (acf-gen.json style)
        const systemPrompt = `
You are an expert WordPress ACF developer. 
Analyze the following HTML and generate a valid ACF Local JSON field group file.
Requirements:
1. Wrap the layouts inside a Flexible Content field key named 'field_page_blocks'.
2. Generate unique 'field_' keys for all sub-fields.
3. Give the group key a unique hash (e.g., 'group_page_blocks_01').
4. Output ONLY valid JSON, with no markdown formatting or code blocks. Do not include \`\`\`json.
`;
        
        const payload = {
            model: "gpt-4o", // Or your preferred agent model
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `HTML Input:\n${htmlContent}` }
            ],
            temperature: 0.2
        };

        // Optional: Save the intermediate payload to a file for debugging
        await fs.writeFile('acf-gen.json', JSON.stringify(payload, null, 2));

        console.log('Sending payload to AI Agent...');

        // 4. Send to Agent via API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const generatedJson = data.choices[0].message.content.trim();

        // 5. Save the generated JSON directly to the theme's acf-json folder
        const outputFilename = `group_${selectedFile.replace('.html', '')}.json`;
        const outputPath = path.join(ACF_JSON_DIR, outputFilename);

        // Ensure directory exists
        await fs.mkdir(ACF_JSON_DIR, { recursive: true });
        await fs.writeFile(outputPath, generatedJson);

        console.log(`\nSuccess! ACF JSON saved to ${outputPath}`);
        console.log('Refresh your WordPress Custom Fields dashboard to sync the group.');

    } catch (error) {
        console.error('Error during execution:', error);
    } finally {
        rl.close();
    }
}

run();