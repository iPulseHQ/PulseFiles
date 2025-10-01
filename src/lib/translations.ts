export type Language = 'nl' | 'en';

export interface Translations {
  // Header
  appName: string;
  myFiles: string;
  login: string;

  // Tips and notifications
  tipLoginTitle: string;
  tipLoginDescription: string;

  // Upload area
  uploadTitle: string;
  uploadDescription: string;
  dragDropText: string;
  upTo2GB: string;
  allTypes: string;
  superFast: string;
  supportedFileTypes: string;
  documents: string;
  images: string;
  videos: string;
  archives: string;

  // File display
  filesSelected: string;
  total: string;

  // Share mode
  howToShare: string;
  shareLink: string;
  shareViaLink: string;
  getShareLink: string;
  directEmail: string;
  sendViaEmail: string;

  // Recipients
  toWho: string;
  yourEmail: string;
  yourEmailOptional: string;
  emailPlaceholder: string;
  addRecipient: string;

  // Settings
  expiresIn: string;
  security: string;
  public: string;
  password: string;
  loginRequired: string;
  setPassword: string;
  enterPassword: string;
  enterStrongPassword: string;

  // Advanced options
  advancedOptions: string;
  title: string;
  giveUploadName: string;
  personalMessage: string;
  addMessageForRecipient: string;
  charactersLimit: string;
  customLinkURL: string;
  customLinkPlaceholder: string;
  linkWillBe: string;
  downloadLimit: string;
  unlimitedDownloads: string;
  limitDownloadTimes: string;

  // Upload progress
  uploading: string;
  of: string;
  speed: string;

  // Errors and messages
  selectFile: string;
  errorPrefix: string;

  // Upload button
  sendFile: string;
  generateShareLink: string;
  sending: string;
  uploadingInProgress: string;

  // Success state
  fileSent: string;
  linkGenerated: string;
  fileSentSuccessfully: string;
  linkReadyToShare: string;
  yourShareLink: string;
  copy: string;
  copied: string;
  expiresOver: string;
  protectedWithPassword: string;
  maxDownloads: string;
  newUpload: string;

  // Expiration options
  expiration1Hour: string;
  expiration6Hours: string;
  expiration1Day: string;
  expiration7Days: string;
  expiration30Days: string;

  // Loading
  loading: string;

  // Additional missing translations
  downloads: string;
  beingUploaded: string;
  beingSent: string;
  estimatedTime: string;

  // Feature highlights
  secureFileSharing: string;
  secureFileSharingDescription: string;
  secured: string;
  private: string;

  // Download page
  linkExpired: string;
  downloadLimitReached: string;
  linkExpiredDescription: string;
  downloadLimitDescription: string;
  linkExpiredMessage: string;
  downloadLimitMessage: string;
  fileInformation: string;
  folderName: string;
  fileName: string;
  size: string;
  files: string;
  uploaded: string;
  downloadsCount: string;
  messageFromSender: string;
  passwordProtected: string;
  authenticationRequired: string;
  goToHomepage: string;
  clickToDownload: string;
  wantToShareFiles: string;
  uploadYourFiles: string;
  folderDownload: string;
  fileDownload: string;
  folderReady: string;
  fileReady: string;
  days: string;
  weeks: string;
  hours: string;
  minutes: string;
  
  // Download security messages
  safeFileDownload: string;
  safeFileDownloadDescription: string;
  virusFree: string;
  virusFreeDescription: string;
  encryptedTransfer: string;
  encryptedTransferDescription: string;
  noMalware: string;
  noMalwareDescription: string;
}

export const translations: Record<Language, Translations> = {
  nl: {
    // Header
    appName: 'PulseFiles',
    myFiles: 'Mijn Bestanden',
    login: 'Inloggen',

    // Tips and notifications
    tipLoginTitle: 'Tip: Log in voor extra features',
    tipLoginDescription: 'Je kunt uploaden zonder account. Log in om je uploads te beheren en terug te bekijken.',

    // Upload area
    uploadTitle: 'Upload je bestanden',
    uploadDescription: 'Sleep bestanden hiernaartoe of klik om te bladeren',
    dragDropText: 'Sleep bestanden hiernaartoe of klik om te bladeren',
    upTo2GB: 'Tot 2GB',
    allTypes: 'Alle types',
    superFast: 'Supersnel',
    supportedFileTypes: 'Ondersteunde bestandstypes',
    documents: 'Documenten',
    images: 'Afbeeldingen',
    videos: "Video's",
    archives: 'Archieven',

    // File display
    filesSelected: 'bestanden geselecteerd',
    total: 'Totaal',

    // Share mode
    howToShare: 'Hoe wil je delen?',
    shareLink: 'Link delen',
    shareViaLink: 'Krijg een share link',
    getShareLink: 'Krijg een share link',
    directEmail: 'Direct mailen',
    sendViaEmail: 'Stuur via email',

    // Recipients
    toWho: 'Naar wie sturen?',
    yourEmail: 'Jouw email (voor notificaties)',
    yourEmailOptional: 'jouw@email.com (optioneel)',
    emailPlaceholder: 'email@voorbeeld.com',
    addRecipient: 'Ontvanger toevoegen',

    // Settings
    expiresIn: 'Vervalt over',
    security: 'Beveiliging',
    public: 'Openbaar',
    password: 'Wachtwoord',
    loginRequired: 'Login vereist',
    setPassword: 'Wachtwoord instellen',
    enterPassword: 'Voer wachtwoord in',
    enterStrongPassword: 'Voer een sterk wachtwoord in',

    // Advanced options
    advancedOptions: 'Geavanceerde opties',
    title: 'Titel',
    giveUploadName: 'Geef je upload een naam (optioneel)',
    personalMessage: 'Persoonlijk bericht',
    addMessageForRecipient: 'Voeg een bericht toe voor de ontvanger (optioneel)',
    charactersLimit: 'tekens',
    customLinkURL: 'Custom link URL',
    customLinkPlaceholder: 'mijn-mooie-link',
    linkWillBe: 'Link wordt:',
    downloadLimit: 'Download limiet',
    unlimitedDownloads: 'Onbeperkt downloads',
    limitDownloadTimes: 'Beperk het aantal keer dat dit bestand gedownload kan worden',

    // Upload progress
    uploading: 'Uploaden...',
    of: 'van',
    speed: 'Snelheid:',

    // Errors and messages
    selectFile: 'Selecteer eerst een bestand',
    errorPrefix: 'Error:',

    // Upload button
    sendFile: 'Verstuur bestand',
    generateShareLink: 'Genereer share link',
    sending: 'Bezig met versturen...',
    uploadingInProgress: 'Bezig met uploaden...',

    // Success state
    fileSent: 'Bestand verstuurd!',
    linkGenerated: 'Link gegenereerd!',
    fileSentSuccessfully: 'Je bestand is succesvol verstuurd naar de ontvanger(s).',
    linkReadyToShare: 'Je link is klaar om te delen. Kopieer en stuur naar wie je wilt!',
    yourShareLink: 'Jouw share link',
    copy: 'Kopieer',
    copied: 'Gekopieerd!',
    expiresOver: 'Verloopt over',
    protectedWithPassword: 'Beveiligd met wachtwoord',
    maxDownloads: 'Max',
    newUpload: 'Nieuwe upload',

    // Expiration options
    expiration1Hour: '1 uur',
    expiration6Hours: '6 uur',
    expiration1Day: '1 dag',
    expiration7Days: '7 dagen',
    expiration30Days: '30 dagen',

    // Loading
    loading: 'Laden...',

    // Additional missing translations
    downloads: 'downloads',
    beingUploaded: 'Bezig met uploaden...',
    beingSent: 'Bezig met versturen...',
    estimatedTime: 'Geschatte tijd',

    // Feature highlights
    secureFileSharing: 'Veilig bestanden delen',
    secureFileSharingDescription: 'Upload tot 2GB gratis. Bestanden worden automatisch verwijderd na de vervaldatum',
    secured: 'Beveiligd',
    private: 'Privé',

    // Download page
    linkExpired: 'Link Verlopen',
    downloadLimitReached: 'Download Limiet Bereikt',
    linkExpiredDescription: 'Deze download link is verlopen om veiligheidsredenen',
    downloadLimitDescription: 'Dit bestand heeft zijn maximum aantal downloads bereikt',
    linkExpiredMessage: 'Deze download link is verlopen om veiligheidsredenen. Neem contact op met de afzender voor een nieuwe link.',
    downloadLimitMessage: 'Dit bestand is {count} keer gedownload en heeft zijn limiet van {max} downloads bereikt.',
    fileInformation: 'Bestandsinformatie',
    folderName: 'Mapnaam:',
    fileName: 'Bestandsnaam:',
    size: 'Grootte:',
    files: 'bestanden',
    uploaded: 'Geüpload:',
    downloadsCount: 'Downloads:',
    messageFromSender: 'Bericht van afzender',
    passwordProtected: 'Wachtwoord Beveiligd',
    authenticationRequired: 'Authenticatie Vereist',
    goToHomepage: 'Ga naar Homepage',
    clickToDownload: 'Klik op de download knop om je {type} op je apparaat op te slaan',
    wantToShareFiles: 'Wil je je eigen bestanden veilig delen?',
    uploadYourFiles: 'Upload Je Bestanden',
    folderDownload: 'Map Downloaden',
    fileDownload: 'Bestand Downloaden',
    folderReady: 'Je map is klaar om te downloaden',
    fileReady: 'Je bestand is klaar om te downloaden',
    days: 'dagen',
    weeks: 'weken',
    hours: 'uur',
    minutes: 'minuten',
    
    // Download security messages
    safeFileDownload: 'Veilig Bestanden Downloaden',
    safeFileDownloadDescription: 'Download je bestanden veilig en zonder zorgen. Alle bestanden worden beveiligd overgedragen.',
    virusFree: 'Virusvrij',
    virusFreeDescription: 'Geen virussen',
    encryptedTransfer: 'Versleuteld',
    encryptedTransferDescription: 'Beveiligde overdracht',
    noMalware: 'Geen Malware',
    noMalwareDescription: 'Schoon en veilig',
  },
  en: {
    // Header
    appName: 'PulseFiles',
    myFiles: 'My Files',
    login: 'Sign In',

    // Tips and notifications
    tipLoginTitle: 'Tip: Sign in for extra features',
    tipLoginDescription: 'You can upload without an account. Sign in to manage and view your uploads.',

    // Upload area
    uploadTitle: 'Upload your files',
    uploadDescription: 'Drag files here or click to browse',
    dragDropText: 'Drag files here or click to browse',
    upTo2GB: 'Up to 2GB',
    allTypes: 'All types',
    superFast: 'Super fast',
    supportedFileTypes: 'Supported file types',
    documents: 'Documents',
    images: 'Images',
    videos: 'Videos',
    archives: 'Archives',

    // File display
    filesSelected: 'files selected',
    total: 'Total',

    // Share mode
    howToShare: 'How do you want to share?',
    shareLink: 'Share link',
    shareViaLink: 'Get a share link',
    getShareLink: 'Get a share link',
    directEmail: 'Direct email',
    sendViaEmail: 'Send via email',

    // Recipients
    toWho: 'Send to whom?',
    yourEmail: 'Your email (for notifications)',
    yourEmailOptional: 'your@email.com (optional)',
    emailPlaceholder: 'email@example.com',
    addRecipient: 'Add recipient',

    // Settings
    expiresIn: 'Expires in',
    security: 'Security',
    public: 'Public',
    password: 'Password',
    loginRequired: 'Login required',
    setPassword: 'Set password',
    enterPassword: 'Enter password',
    enterStrongPassword: 'Enter a strong password',

    // Advanced options
    advancedOptions: 'Advanced options',
    title: 'Title',
    giveUploadName: 'Give your upload a name (optional)',
    personalMessage: 'Personal message',
    addMessageForRecipient: 'Add a message for the recipient (optional)',
    charactersLimit: 'characters',
    customLinkURL: 'Custom link URL',
    customLinkPlaceholder: 'my-awesome-link',
    linkWillBe: 'Link will be:',
    downloadLimit: 'Download limit',
    unlimitedDownloads: 'Unlimited downloads',
    limitDownloadTimes: 'Limit the number of times this file can be downloaded',

    // Upload progress
    uploading: 'Uploading...',
    of: 'of',
    speed: 'Speed:',

    // Errors and messages
    selectFile: 'Select a file first',
    errorPrefix: 'Error:',

    // Upload button
    sendFile: 'Send file',
    generateShareLink: 'Generate share link',
    sending: 'Sending...',
    uploadingInProgress: 'Uploading...',

    // Success state
    fileSent: 'File sent!',
    linkGenerated: 'Link generated!',
    fileSentSuccessfully: 'Your file has been successfully sent to the recipient(s).',
    linkReadyToShare: 'Your link is ready to share. Copy and send to anyone you want!',
    yourShareLink: 'Your share link',
    copy: 'Copy',
    copied: 'Copied!',
    expiresOver: 'Expires in',
    protectedWithPassword: 'Protected with password',
    maxDownloads: 'Max',
    newUpload: 'New upload',

    // Expiration options
    expiration1Hour: '1 hour',
    expiration6Hours: '6 hours',
    expiration1Day: '1 day',
    expiration7Days: '7 days',
    expiration30Days: '30 days',

    // Loading
    loading: 'Loading...',

    // Additional missing translations
    downloads: 'downloads',
    beingUploaded: 'Uploading...',
    beingSent: 'Sending...',
    estimatedTime: 'Estimated time',

    // Feature highlights
    secureFileSharing: 'Secure file sharing',
    secureFileSharingDescription: 'Upload up to 2GB for free. Files are automatically deleted after the expiration date',
    secured: 'Secured',
    private: 'Private',

    // Download page
    linkExpired: 'Link Expired',
    downloadLimitReached: 'Download Limit Reached',
    linkExpiredDescription: 'This download link has expired for security purposes',
    downloadLimitDescription: 'This file has reached its maximum download limit',
    linkExpiredMessage: 'This download link has expired for security purposes. Please contact the sender for a new link.',
    downloadLimitMessage: 'This file has been downloaded {count} times and has reached its limit of {max} downloads.',
    fileInformation: 'File Information',
    folderName: 'Folder name:',
    fileName: 'File name:',
    size: 'Size:',
    files: 'files',
    uploaded: 'Uploaded:',
    downloadsCount: 'Downloads:',
    messageFromSender: 'Message from sender',
    passwordProtected: 'Password Protected',
    authenticationRequired: 'Authentication Required',
    goToHomepage: 'Go to Homepage',
    clickToDownload: 'Click the download button to save your {type} to your device',
    wantToShareFiles: 'Want to share your own files securely?',
    uploadYourFiles: 'Upload Your Files',
    folderDownload: 'Folder Download',
    fileDownload: 'File Download',
    folderReady: 'Your folder is ready for download',
    fileReady: 'Your file is ready for download',
    days: 'days',
    weeks: 'weeks',
    hours: 'hours',
    minutes: 'minutes',
    
    // Download security messages
    safeFileDownload: 'Safe File Download',
    safeFileDownloadDescription: 'Download your files safely and worry-free. All files are transferred securely.',
    virusFree: 'Virus-Free',
    virusFreeDescription: 'No viruses',
    encryptedTransfer: 'Encrypted',
    encryptedTransferDescription: 'Secure transfer',
    noMalware: 'No Malware',
    noMalwareDescription: 'Clean and safe',
  },
};

export const getExpirationLabel = (key: string, language: Language): string => {
  const labels: Record<string, Record<Language, string>> = {
    '1hour': {
      nl: '1 uur',
      en: '1 hour',
    },
    '6hours': {
      nl: '6 uur',
      en: '6 hours',
    },
    '1day': {
      nl: '1 dag',
      en: '1 day',
    },
    '7days': {
      nl: '7 dagen',
      en: '7 days',
    },
    '30days': {
      nl: '30 dagen',
      en: '30 days',
    },
  };

  return labels[key]?.[language] || key;
};
