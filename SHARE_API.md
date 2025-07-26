# PulseFiles Share API Documentation

Share files programmatically with the PulseFiles API and integrate "Share on PulseFiles" functionality into your applications.

## Getting Started

### 1. Create an API Key

1. Go to your [PulseFiles Dashboard](https://pulsefiles.app/dashboard)
2. Click on the "API Keys" tab
3. Click "Create API Key"
4. Give your API key a descriptive name
5. Copy and securely store your API key

### 2. API Endpoint

```
POST https://pulsefiles.app/api/share
```

### 3. Authentication

Include your API key in the request header:

```
x-api-key: pf_your_api_key_here
```

## API Usage

### Share a File

**Request:**
```bash
curl -X POST https://pulsefiles.app/api/share \
  -H "x-api-key: pf_your_api_key_here" \
  -F "file=@document.pdf" \
  -F "title=My Document" \
  -F "expiration=7days"
```

**Parameters:**
- `file` (required): The file to share
- `title` (optional): Custom title for the shared file
- `expiration` (optional): When the link expires. Options: `1hour`, `24hours`, `7days`, `30days`, `never`

**Response:**
```json
{
  "success": true,
  "shareUrl": "https://pulsefiles.app/download/abc123",
  "fileId": "abc123",
  "title": "My Document",
  "expiresAt": "2024-01-01T00:00:00.000Z",
  "message": "File shared successfully"
}
```

### JavaScript Example

```javascript
async function shareFile(file, apiKey) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', 'My Document');
  formData.append('expiration', '7days');

  const response = await fetch('https://pulsefiles.app/api/share', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey
    },
    body: formData
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Share URL:', result.shareUrl);
    return result.shareUrl;
  } else {
    throw new Error(result.error);
  }
}
```

### Python Example

```python
import requests

def share_file(file_path, api_key, title=None, expiration='7days'):
    url = 'https://pulsefiles.app/api/share'
    
    headers = {
        'x-api-key': api_key
    }
    
    files = {
        'file': open(file_path, 'rb')
    }
    
    data = {
        'title': title or file_path.split('/')[-1],
        'expiration': expiration
    }
    
    response = requests.post(url, headers=headers, files=files, data=data)
    result = response.json()
    
    if result.get('success'):
        return result['shareUrl']
    else:
        raise Exception(result.get('error', 'Failed to share file'))

# Usage
share_url = share_file('document.pdf', 'pf_your_api_key_here')
print(f'Share URL: {share_url}')
```

## Share Widget Integration

Add a "Share on PulseFiles" button to your website with our JavaScript widget.

### Quick Setup

1. Include the widget script:
```html
<script src="https://pulsefiles.app/share-widget.js"></script>
```

2. Add a share button with data attributes:
```html
<div data-pulsefiles-share 
     data-api-key="pf_your_api_key_here"
     data-text="Share on PulseFiles"
     data-expiration="7days">
</div>
```

### Advanced Usage

```html
<script src="https://pulsefiles.app/share-widget.js"></script>

<input type="file" id="fileInput" />
<div id="shareButton"></div>

<script>
// Create a custom share button
const shareButton = PulseFiles.createShareButton({
  text: 'Share on PulseFiles',
  fileInput: document.getElementById('fileInput'),
  apiKey: 'pf_your_api_key_here',
  expiration: '7days',
  onSuccess: (result) => {
    alert(`File shared! URL: ${result.shareUrl}`);
  },
  onError: (error) => {
    alert(`Error: ${error.message}`);
  }
});

document.getElementById('shareButton').appendChild(shareButton);
</script>
```

### Share Button Badge

You can also use our pre-made SVG badge:

```html
<a href="#" onclick="shareWithPulseFiles()">
  <img src="https://pulsefiles.app/share-button.svg" alt="Share on PulseFiles" />
</a>
```

## Widget Configuration

### Data Attributes

- `data-pulsefiles-share`: Marks element for auto-initialization
- `data-api-key`: Your PulseFiles API key (required)
- `data-file-input`: CSS selector for file input element
- `data-title`: Default title for shared files
- `data-expiration`: Default expiration time
- `data-text`: Button text

### JavaScript API

#### `PulseFiles.shareFile(file, options)`

Share a file programmatically.

**Parameters:**
- `file`: File object to share
- `options`: Configuration object
  - `apiKey`: Your API key (required)
  - `title`: File title
  - `expiration`: Expiration time
  - `onSuccess`: Success callback
  - `onError`: Error callback

#### `PulseFiles.createShareButton(options)`

Create a share button element.

**Options:**
- `text`: Button text
- `fileInput`: File input element
- `apiKey`: Your API key
- `title`: Default title
- `expiration`: Default expiration
- `className`: CSS class name
- `style`: Inline styles object
- `onSuccess`: Success callback
- `onError`: Error callback

## Examples

### React Component

```jsx
import { useRef } from 'react';

function ShareButton({ apiKey }) {
  const fileInputRef = useRef();

  const handleShare = async () => {
    const file = fileInputRef.current.files[0];
    if (!file) return;

    try {
      const result = await PulseFiles.shareFile(file, {
        apiKey,
        title: file.name,
        expiration: '7days'
      });
      
      alert(`File shared! URL: ${result.shareUrl}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleShare}
      />
      <button onClick={() => fileInputRef.current.click()}>
        📤 Share on PulseFiles
      </button>
    </div>
  );
}
```

### Vue.js Component

```vue
<template>
  <div>
    <input 
      ref="fileInput"
      type="file" 
      style="display: none"
      @change="handleShare"
    />
    <button @click="$refs.fileInput.click()">
      📤 Share on PulseFiles
    </button>
  </div>
</template>

<script>
export default {
  props: ['apiKey'],
  methods: {
    async handleShare(event) {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const result = await PulseFiles.shareFile(file, {
          apiKey: this.apiKey,
          title: file.name,
          expiration: '7days'
        });
        
        alert(`File shared! URL: ${result.shareUrl}`);
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  }
}
</script>
```

## Error Handling

Common error responses:

- `401`: Invalid or missing API key
- `400`: Missing file or invalid parameters
- `500`: Server error

Always check the `success` field in the response and handle errors appropriately.

## Rate Limits

- 100 requests per hour per API key
- Maximum file size: 10GB
- Supported file types: All file types are supported

## Security

- Store your API keys securely
- Never expose API keys in client-side code
- Use environment variables for API keys in production
- Rotate API keys regularly

## Support

For support or questions about the PulseFiles API:

- Documentation: [https://pulsefiles.app/docs](https://pulsefiles.app/docs)
- GitHub: [https://github.com/pulsefilesapp/pulsefiles](https://github.com/pulsefilesapp/pulsefiles)
- Email: support@pulsefiles.app