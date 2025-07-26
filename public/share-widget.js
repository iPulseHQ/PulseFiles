// PulseFiles Share Widget
// Add this script to your website to enable "Share on PulseFiles" functionality

(function() {
  'use strict';

  // Configuration
  const PULSEFILES_API_URL = 'https://pulsefiles.app/api/share';
  
  // Default styles for the share button
  const DEFAULT_STYLES = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'background-color 0.2s'
  };

  // Create PulseFiles logo SVG
  function createLogoSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
    return svg;
  }

  // Share file function
  async function shareFile(file, options = {}) {
    const {
      apiKey,
      title = file.name,
      expiration = '7days',
      onSuccess,
      onError,
      onProgress
    } = options;

    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!file) {
      throw new Error('File is required');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('expiration', expiration);

      const response = await fetch(PULSEFILES_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to share file');
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }

  // Create share button
  function createShareButton(options = {}) {
    const {
      text = 'Share on PulseFiles',
      fileInput,
      apiKey,
      title,
      expiration = '7days',
      className = '',
      style = {},
      onSuccess,
      onError
    } = options;

    const button = document.createElement('button');
    button.className = `pulsefiles-share-btn ${className}`;
    
    // Apply default styles
    Object.assign(button.style, DEFAULT_STYLES, style);
    
    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#2563EB';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = style.backgroundColor || DEFAULT_STYLES.backgroundColor;
    });

    // Create button content
    const logo = createLogoSVG();
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    
    button.appendChild(logo);
    button.appendChild(textSpan);

    // Handle click
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      
      let file = null;
      
      // Get file from input or show file picker
      if (fileInput) {
        file = fileInput.files[0];
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';
        
        return new Promise((resolve) => {
          input.addEventListener('change', async () => {
            file = input.files[0];
            if (file) {
              try {
                button.disabled = true;
                button.style.opacity = '0.7';
                textSpan.textContent = 'Sharing...';
                
                const result = await shareFile(file, {
                  apiKey,
                  title: title || file.name,
                  expiration,
                  onSuccess,
                  onError
                });
                
                textSpan.textContent = 'Shared!';
                setTimeout(() => {
                  textSpan.textContent = text;
                  button.disabled = false;
                  button.style.opacity = '1';
                }, 2000);
                
                resolve(result);
              } catch (error) {
                textSpan.textContent = 'Error!';
                setTimeout(() => {
                  textSpan.textContent = text;
                  button.disabled = false;
                  button.style.opacity = '1';
                }, 2000);
                throw error;
              }
            }
          });
          
          input.click();
        });
      }
      
      if (!file) {
        alert('Please select a file to share');
        return;
      }

      try {
        button.disabled = true;
        button.style.opacity = '0.7';
        textSpan.textContent = 'Sharing...';
        
        const result = await shareFile(file, {
          apiKey,
          title: title || file.name,
          expiration,
          onSuccess,
          onError
        });
        
        textSpan.textContent = 'Shared!';
        setTimeout(() => {
          textSpan.textContent = text;
          button.disabled = false;
          button.style.opacity = '1';
        }, 2000);
        
        return result;
      } catch (error) {
        textSpan.textContent = 'Error!';
        setTimeout(() => {
          textSpan.textContent = text;
          button.disabled = false;
          button.style.opacity = '1';
        }, 2000);
        throw error;
      }
    });

    return button;
  }

  // Auto-initialize buttons with data attributes
  function initializeButtons() {
    const buttons = document.querySelectorAll('[data-pulsefiles-share]');
    
    buttons.forEach(element => {
      const apiKey = element.getAttribute('data-api-key');
      const fileInputSelector = element.getAttribute('data-file-input');
      const title = element.getAttribute('data-title');
      const expiration = element.getAttribute('data-expiration') || '7days';
      const text = element.getAttribute('data-text') || 'Share on PulseFiles';
      
      if (!apiKey) {
        console.error('PulseFiles: data-api-key is required');
        return;
      }
      
      const fileInput = fileInputSelector ? document.querySelector(fileInputSelector) : null;
      
      const shareButton = createShareButton({
        text,
        fileInput,
        apiKey,
        title,
        expiration,
        onSuccess: (result) => {
          console.log('File shared successfully:', result);
          // Copy share URL to clipboard
          if (navigator.clipboard) {
            navigator.clipboard.writeText(result.shareUrl);
            alert(`File shared! Link copied to clipboard:\n${result.shareUrl}`);
          } else {
            alert(`File shared! Share URL:\n${result.shareUrl}`);
          }
        },
        onError: (error) => {
          console.error('Failed to share file:', error);
          alert(`Failed to share file: ${error.message}`);
        }
      });
      
      // Replace the element with the share button
      element.parentNode.replaceChild(shareButton, element);
    });
  }

  // Expose global API
  window.PulseFiles = {
    shareFile,
    createShareButton,
    init: initializeButtons
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeButtons);
  } else {
    initializeButtons();
  }
})();