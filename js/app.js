/**
 * Veeva Vault VQL Query Builder Web App
 */

// Debug mode settings
const DEBUG_MODE = true;
let debugLog = [];

// Global state
let vaultClient = {
    baseUrl: '',
    username: '',
    password: '',
    verifySSL: true,
    sessionId: null,
    currentObject: null,
    objectFields: [],
    selectedFields: [],
    allObjects: []
};

// Initialize tooltips
const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});

// DOM elements
const connectionForm = document.getElementById('connection-form');
const vaultUrlInput = document.getElementById('vault-url');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const verifySSLCheck = document.getElementById('verify-ssl');
const saveCredentialsCheck = document.getElementById('save-credentials');
const connectionStatus = document.getElementById('connection-status');
const statusMessage = document.getElementById('status-message');
const queryBuilderTabBtn = document.getElementById('query-builder-tab-btn');
const resultsTabBtn = document.getElementById('results-tab-btn');
const objectSelect = document.getElementById('object-select');
const objectList = document.getElementById('object-list');
const fieldsContainer = document.getElementById('fields-container');
const sortFieldSelect = document.getElementById('sort-field');
const sortDirectionSelect = document.getElementById('sort-direction');
const nullsPositionSelect = document.getElementById('nulls-position');
const filtersContainer = document.getElementById('filters-container');
const addFilterBtn = document.getElementById('add-filter');
const maxRecordsInput = document.getElementById('max-records');
const queryText = document.getElementById('query-text');
const executeQueryBtn = document.getElementById('execute-query');
const exportQueryBtn = document.getElementById('export-query');
const resultsText = document.getElementById('results-text');
const resultsTable = document.getElementById('results-table');
const exportResultsBtn = document.getElementById('export-results');
const copyClipboardBtn = document.getElementById('copy-clipboard');
const clearResultsBtn = document.getElementById('clear-results');
const resultsStatus = document.getElementById('results-status');
const debugButton = document.getElementById('debug-button');
const debugOverlay = document.getElementById('debug-overlay');
const debugLogElement = document.getElementById('debug-log');
const systemInfoElement = document.getElementById('system-info');
const apiStatusElement = document.getElementById('api-status');
const uiStateElement = document.getElementById('ui-state');
const closeDebugBtn = document.getElementById('close-debug');

// Initialize the application
function init() {
    // Load configuration
    loadConfig();
    
    // Set up event listeners
    setupEventListeners();
    
    // Log initialization
    logDebug('Application initialized');
}

// Event listeners setup
function setupEventListeners() {
    // Connection form submission
    connectionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        connectToVault();
    });
    
    // Object selection
    objectSelect.addEventListener('input', filterObjects);
    objectSelect.addEventListener('change', onObjectSelected);
    
    // Field selection in container
    fieldsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('field-item')) {
            toggleFieldSelection(e.target);
            updateQuery();
        }
    });
    
    // Sorting and filtering options
    sortFieldSelect.addEventListener('change', updateQuery);
    sortDirectionSelect.addEventListener('change', updateQuery);
    nullsPositionSelect.addEventListener('change', updateQuery);
    addFilterBtn.addEventListener('click', addFilterRow);
    maxRecordsInput.addEventListener('input', updateQuery);
    
    // Query execution
    executeQueryBtn.addEventListener('click', executeQuery);
    exportQueryBtn.addEventListener('click', exportQueryToCsv);
    
    // Results actions
    exportResultsBtn.addEventListener('click', exportResults);
    copyClipboardBtn.addEventListener('click', copyToClipboard);
    clearResultsBtn.addEventListener('click', clearResults);
    
    // Debug overlay
    debugButton.addEventListener('click', showDebugInfo);
    closeDebugBtn.addEventListener('click', function() {
        debugOverlay.style.display = 'none';
    });
    
    // Output format and archived records
    document.querySelectorAll('input[name="output-format"]').forEach(radio => {
        radio.addEventListener('change', updateQuery);
    });
    
    document.querySelectorAll('input[name="include-archived"]').forEach(radio => {
        radio.addEventListener('change', updateQuery);
    });
}

// Debug logging
function logDebug(message) {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp}: ${message}`;
        debugLog.push(logMessage);
        console.log(`DEBUG: ${logMessage}`);
    }
}

// Show debug information
function showDebugInfo() {
    // Update debug log
    debugLogElement.textContent = debugLog.join('\n');
    
    // Update system info
    systemInfoElement.textContent = `Browser: ${navigator.userAgent}\n` +
        `Screen Resolution: ${window.screen.width}x${window.screen.height}\n` +
        `Window Size: ${window.innerWidth}x${window.innerHeight}\n` +
        `Local Storage Available: ${typeof(Storage) !== 'undefined'}\n`;
    
    // Update API status
    apiStatusElement.textContent = `Client initialized: ${vaultClient.baseUrl !== ''}\n` +
        `Session ID exists: ${vaultClient.sessionId !== null}\n` +
        `Verify SSL: ${vaultClient.verifySSL}\n`;
    
    // Update UI state
    uiStateElement.textContent = `Current object: ${vaultClient.currentObject}\n` +
        `Object fields count: ${vaultClient.objectFields.length}\n` +
        `Selected fields: ${vaultClient.selectedFields.join(', ')}\n` +
        `Loaded Objects: ${vaultClient.allObjects.length}\n`;
    
    if (vaultClient.allObjects.length > 0) {
        uiStateElement.textContent += `First 10 objects: ${vaultClient.allObjects.slice(0, 10).join(', ')}\n`;
    }
    
    // Show the overlay
    debugOverlay.style.display = 'block';
}

// Load saved configuration
function loadConfig() {
    try {
        const savedConfig = localStorage.getItem('veevaVaultConfig');
        
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            
            vaultUrlInput.value = config.url || '';
            usernameInput.value = config.username || '';
            
            if (config.saveCredentials) {
                saveCredentialsCheck.checked = true;
                if (config.password) {
                    passwordInput.value = config.password || '';
                }
            }
            
            verifySSLCheck.checked = config.verifySSL !== false;
            
            logDebug('Loaded configuration from localStorage');
        }
    } catch (error) {
        const errorMsg = `Error loading saved configuration: ${error.message}`;
        logDebug(errorMsg);
        showAlert(connectionStatus, 'warning', errorMsg);
    }
}

// Save configuration
function saveConfig() {
    try {
        const config = {
            url: vaultUrlInput.value,
            username: usernameInput.value,
            verifySSL: verifySSLCheck.checked,
            saveCredentials: saveCredentialsCheck.checked
        };
        
        if (saveCredentialsCheck.checked) {
            config.password = passwordInput.value;
        }
        
        localStorage.setItem('veevaVaultConfig', JSON.stringify(config));
        logDebug('Saved configuration to localStorage');
    } catch (error) {
        const errorMsg = `Error saving configuration: ${error.message}`;
        logDebug(errorMsg);
        showAlert(connectionStatus, 'warning', errorMsg);
    }
}

// Connect to Veeva Vault
function connectToVault() {
    const url = vaultUrlInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const verifySSL = verifySSLCheck.checked;
    
    if (!url || !username || !password) {
        showAlert(connectionStatus, 'danger', 'Please enter all connection details');
        return;
    }
    
    // Update status
    statusMessage.textContent = 'Connecting to Veeva Vault...';
    showAlert(connectionStatus, 'info', 'Connecting...');
    
    logDebug(`Attempting to connect to ${url} with username ${username}`);
    
    // Save configuration
    saveConfig();
    
    // Initialize client
    vaultClient.baseUrl = url.startsWith('https://') ? url : `https://${url}`;
    vaultClient.username = username;
    vaultClient.password = password;
    vaultClient.verifySSL = verifySSL;
    
    // Authenticate
    login()
        .then(function(sessionId) {
            vaultClient.sessionId = sessionId;
            showAlert(connectionStatus, 'success', 'Connected successfully');
            statusMessage.textContent = 'Connected to Veeva Vault';
            
            // Enable Query Builder tab
            queryBuilderTabBtn.classList.remove('disabled');
            resultsTabBtn.classList.remove('disabled');
            
            // Switch to Query Builder tab
            document.getElementById('query-builder-tab-btn').click();
            
            logDebug('Successfully connected to Veeva Vault');
            
            // Load available objects
            loadObjects();
        })
        .catch(function(error) {
            showAlert(connectionStatus, 'danger', `Connection failed: ${error}`);
            statusMessage.textContent = 'Connection failed';
            logDebug(`Connection failed: ${error}`);
        });
}

// Login to Veeva Vault
// Update the login function in app.js
async function login() {
    try {
        const authUrl = `${vaultClient.baseUrl}/api/v24.1/auth`;
        
        // Using a CORS proxy for development / to be removed with own is success
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const urlToFetch = proxyUrl + authUrl;
        
        // Create form data
        const formData = new FormData();
        formData.append('username', vaultClient.username);
        formData.append('password', vaultClient.password);
        
        // Make request
        const response = await fetch(urlToFetch, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.responseStatus === 'SUCCESS') {
            return data.sessionId;
        } else {
            const errorMessage = data.responseMessage || 'Authentication failed';
            throw new Error(errorMessage);
        }
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            throw new Error('CORS error: Cannot connect to Veeva Vault API from browser. ' + 
                           'This is likely due to CORS restrictions. Try using a CORS proxy or contact Veeva Support to enable CORS for your vault.');
        }
        throw new Error(`Login error: ${error.message}`);
    }
}

// Execute a VQL query
async function executeVqlQuery(vqlQuery) {
    try {
        if (!vaultClient.sessionId) {
            throw new Error('Not authenticated. Please log in first.');
        }
        
        const queryUrl = `${vaultClient.baseUrl}/api/v24.1/query`;
        
        // Create form data
        const formData = new FormData();
        formData.append('q', vqlQuery);
        
        // Make request
        const response = await fetch(queryUrl, {
            method: 'POST',
            headers: {
                'Authorization': vaultClient.sessionId
            },
            body: formData
        });
        
        return await response.json();
    } catch (error) {
        throw new Error(`Query execution error: ${error.message}`);
    }
}

// Get object metadata
async function getObjectMetadata(objectName) {
    try {
        if (!vaultClient.sessionId) {
            throw new Error('Not authenticated. Please log in first.');
        }
        
        const metadataUrl = `${vaultClient.baseUrl}/api/v24.1/metadata/objects/${objectName}`;
        
        // Make request
        const response = await fetch(metadataUrl, {
            method: 'GET',
            headers: {
                'Authorization': vaultClient.sessionId
            }
        });
        
        const responseJson = await response.json();
        
        // For documents, we might need to make an additional API call
        if (objectName === 'documents' && responseJson.types) {
            if (responseJson.types && responseJson.types.length > 0) {
                const typeUrl = responseJson.types[0].value;
                
                const typeResponse = await fetch(typeUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': vaultClient.sessionId
                    }
                });
                
                const typeJson = await typeResponse.json();
                
                if (typeJson.responseStatus === 'SUCCESS') {
                    // Create a wrapped response with the fields data
                    return {
                        responseStatus: 'SUCCESS',
                        data: {
                            fields: typeJson.fields || []
                        }
                    };
                }
            }
        }
        
        // For standard objects, direct query for fields might be needed
        if ((objectName === 'users' || objectName === 'groups') && !responseJson.fields) {
            const fieldsUrl = `${vaultClient.baseUrl}/api/v24.1/metadata/objects/${objectName}/fields`;
            
            const fieldsResponse = await fetch(fieldsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': vaultClient.sessionId
                }
            });
            
            const fieldsJson = await fieldsResponse.json();
            
            if (fieldsJson.responseStatus === 'SUCCESS') {
                return {
                    responseStatus: 'SUCCESS',
                    data: {
                        fields: fieldsJson.fields || []
                    }
                };
            }
        }
        
        // For vobjects, the format might be different
        if (responseJson.object && responseJson.fields) {
            return {
                responseStatus: 'SUCCESS',
                data: {
                    fields: responseJson.fields || []
                }
            };
        }
        
        return responseJson;
    } catch (error) {
        throw new Error(`Metadata retrieval error: ${error.message}`);
    }
}

// Get available objects
async function getObjects() {
    try {
        if (!vaultClient.sessionId) {
            throw new Error('Not authenticated. Please log in first.');
        }
        
        const objectsUrl = `${vaultClient.baseUrl}/api/v24.1/metadata/objects`;
        
        // Make request
        const response = await fetch(objectsUrl, {
            method: 'GET',
            headers: {
                'Authorization': vaultClient.sessionId
            }
        });
        
        return await response.json();
    } catch (error) {
        throw new Error(`Object retrieval error: ${error.message}`);
    }
}

// Load available objects
function loadObjects() {
    statusMessage.textContent = 'Loading objects...';
    logDebug('Retrieving objects list from Veeva Vault');
    
    getObjects()
        .then(function(response) {
            const objects = [];
            
            // Check if response has 'values' field (new API format)
            if (response.values) {
                const values = response.values;
                
                // Add standard objects from keys (excluding 'vobjects')
                for (const key in values) {
                    if (key !== 'vobjects') {
                        objects.push(key);
                    }
                }
                
                // Fetch vobjects if URL is provided
                if (values.vobjects) {
                    const vobjectsUrl = values.vobjects;
                    logDebug(`Fetching vobjects from: ${vobjectsUrl}`);
                    
                    fetch(vobjectsUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': vaultClient.sessionId
                        }
                    })
                    .then(response => response.json())
                    .then(vobjectsData => {
                        // Try both potential response formats
                        if (vobjectsData.vobjects) {
                            // Extract vobject names
                            for (const obj of vobjectsData.vobjects) {
                                const name = obj.name || '';
                                if (name) {
                                    objects.push(name);
                                }
                            }
                            
                            logDebug(`Added ${vobjectsData.vobjects.length} vobjects`);
                        } else if (vobjectsData.data) {
                            // Extract vobject names
                            for (const obj of vobjectsData.data) {
                                const name = obj.name || '';
                                if (name) {
                                    objects.push(name);
                                }
                            }
                            
                            logDebug(`Added ${vobjectsData.data.length} vobjects`);
                        } else {
                            logDebug("No 'vobjects' or 'data' field in vobjects response");
                            logDebug(`vobjectsData keys: ${Object.keys(vobjectsData).join(', ')}`);
                        }
                        
                        // Update objects list after fetching vobjects
                        updateObjectsList(objects);
                    })
                    .catch(error => {
                        logDebug(`Error fetching vobjects: ${error.message}`);
                        // Still update with standard objects
                        updateObjectsList(objects);
                    });
                } else {
                    // Just update with standard objects if no vobjects URL
                    updateObjectsList(objects);
                }
            } 
            // Check if response has 'data' field (old API format)
            else if (response.data) {
                for (const obj of response.data) {
                    const name = obj.name || '';
                    if (name) {
                        objects.push(name);
                    }
                }
                
                updateObjectsList(objects);
            } else {
                throw new Error('Invalid response format');
            }
        })
        .catch(function(error) {
            const errorMsg = `Failed to load objects: ${error.message}`;
            logDebug(errorMsg);
            statusMessage.textContent = 'Failed to load objects';
            showAlert(connectionStatus, 'danger', errorMsg);
        });
}

// Update objects list
function updateObjectsList(objects) {
    // Sort alphabetically
    objects.sort();
    
    // Clear datalist
    objectList.innerHTML = '';
    
    // Add objects to datalist
    for (const obj of objects) {
        const option = document.createElement('option');
        option.value = obj;
        objectList.appendChild(option);
    }
    
    // Store for filtering
    vaultClient.allObjects = objects;
    
    logDebug(`Loaded ${objects.length} objects`);
    statusMessage.textContent = `Loaded ${objects.length} objects`;
}

// Filter objects
function filterObjects() {
    const currentText = objectSelect.value.trim().toLowerCase();
    
    if (currentText) {
        const filteredObjects = vaultClient.allObjects.filter(obj => 
            obj.toLowerCase().includes(currentText)
        );
        
        // Clear datalist
        objectList.innerHTML = '';
        
        // Add filtered objects to datalist
        for (const obj of filteredObjects) {
            const option = document.createElement('option');
            option.value = obj;
            objectList.appendChild(option);
        }
    } else {
        // If no text, restore all objects
        objectList.innerHTML = '';
        for (const obj of vaultClient.allObjects) {
            const option = document.createElement('option');
            option.value = obj;
            objectList.appendChild(option);
        }
    }
}

// Handle object selection
function onObjectSelected() {
    try {
        const selectedObject = objectSelect.value.trim();
        if (!selectedObject) {
            return;
        }
        
        vaultClient.currentObject = selectedObject;
        statusMessage.textContent = `Loading metadata for ${selectedObject}...`;
        
        logDebug(`Selected object: ${selectedObject}`);
        
        // Clear previous fields and selections
        fieldsContainer.innerHTML = '<div class="text-center py-3 text-muted">Loading fields...</div>';
        vaultClient.selectedFields = [];
        vaultClient.objectFields = [];
        
        // Get object metadata
        getObjectMetadata(selectedObject)
            .then(function(response) {
                logDebug(`Response keys: ${Object.keys(response).join(', ')}`);
                
                // Extract field information from different possible response formats
                let fieldsData = [];
                
                if (response.data && response.data.fields) {
                    fieldsData = response.data.fields;
                    logDebug(`Using data.fields format, found ${fieldsData.length} fields`);
                } else if (response.fields) {
                    fieldsData = response.fields;
                    logDebug(`Using direct fields format, found ${fieldsData.length} fields`);
                } else if (response.properties && response.properties.fields) {
                    fieldsData = response.properties.fields;
                    logDebug(`Using properties.fields format, found ${fieldsData.length} fields`);
                } else if (response.document_metadata_fields) {
                    fieldsData = response.document_metadata_fields;
                    logDebug(`Using document_metadata_fields, found ${fieldsData.length} fields`);
                } else if (response.types) {
                    // Could not load fields, but we can use some default document fields
                    logDebug("Could not find fields in metadata response. Using default document fields.");
                    fieldsData = [
                        {"name": "id", "label": "ID", "type": "ID", "required": true},
                        {"name": "name__v", "label": "Name", "type": "String", "required": true},
                        {"name": "type__v", "label": "Type", "type": "String", "required": true},
                        {"name": "status__v", "label": "Status", "type": "String", "required": true},
                        {"name": "document_creation_date__v", "label": "Creation Date", "type": "Date", "required": false},
                        {"name": "created_by__v", "label": "Created By", "type": "Object", "required": false},
                        {"name": "version__v", "label": "Version", "type": "Number", "required": false}
                    ];
                } else {
                    logDebug(`Could not find fields in metadata response with keys: ${Object.keys(response).join(', ')}`);
                    
                    // Try to extract any fields found in the response
                    for (const key in response) {
                        if (Array.isArray(response[key]) && response[key].length > 0 && 
                            typeof response[key][0] === 'object' && response[key][0].name) {
                            logDebug(`Found possible fields in key: ${key}`);
                            fieldsData = response[key];
                            break;
                        }
                    }
                }
                
                // Process the fields
                vaultClient.objectFields = [];
                
                // Clear fields container
                fieldsContainer.innerHTML = '';
                
                // Add count() as special field
                const countField = document.createElement('div');
                countField.className = 'field-item';
                countField.setAttribute('data-field', 'count()');
                countField.textContent = 'count()';
                fieldsContainer.appendChild(countField);
                
                for (const field of fieldsData) {
                    if (field.name) {
                        vaultClient.objectFields.push({
                            name: field.name,
                            label: field.label || '',
                            type: field.type || '',
                            required: field.required || false
                        });
                        
                        // Add to fields container
                        const fieldItem = document.createElement('div');
                        fieldItem.className = 'field-item';
                        fieldItem.setAttribute('data-field', field.name);
                        fieldItem.textContent = field.name;
                        fieldsContainer.appendChild(fieldItem);
                    }
                }
                
                // Update field dropdowns for sorting and filtering
                updateFieldDropdowns();
                
                // Clear any existing filter rows and add one
                filtersContainer.innerHTML = '';
                addFilterRow();
                
                statusMessage.textContent = `Loaded metadata for ${selectedObject}`;
                
                // Update query preview
                updateQuery();
            })
            .catch(function(error) {
                const errorMsg = `Failed to load metadata: ${error.message}`;
                logDebug(errorMsg);
                statusMessage.textContent = `Failed to load metadata for ${selectedObject}`;
                showAlert(connectionStatus, 'danger', errorMsg);
                
                // Clear fields container
                fieldsContainer.innerHTML = '<div class="text-center py-3 text-danger">Failed to load fields</div>';
            });
    } catch (error) {
        const errorMsg = `Exception loading metadata: ${error.message}`;
        logDebug(errorMsg);
        logDebug(error.stack);
        statusMessage.textContent = `Error loading metadata for ${objectSelect.value}`;
        showAlert(connectionStatus, 'danger', errorMsg);
    }
}

// Update field dropdowns
function updateFieldDropdowns() {
    // Clear sort field dropdown
    sortFieldSelect.innerHTML = '<option value="">-- Select Field --</option>';
    
    // Add fields to sort dropdown
    for (const field of vaultClient.objectFields) {
        const option = document.createElement('option');
        option.value = field.name;
        option.textContent = field.name;
        sortFieldSelect.appendChild(option);
    }
}

// Toggle field selection
function toggleFieldSelection(fieldElement) {
    const fieldName = fieldElement.getAttribute('data-field');
    
    if (fieldElement.classList.contains('selected')) {
        // Deselect
        fieldElement.classList.remove('selected');
        vaultClient.selectedFields = vaultClient.selectedFields.filter(f => f !== fieldName);
    } else {
        // Select
        fieldElement.classList.add('selected');
        vaultClient.selectedFields.push(fieldName);
    }
    
    logDebug(`Selected fields: ${vaultClient.selectedFields.join(', ')}`);
}

// Add filter row
function addFilterRow() {
    const rowIndex = document.querySelectorAll('.filter-row').length;
    
    // Create filter row
    const filterRow = document.createElement('div');
    filterRow.className = 'filter-row row mb-2';
    filterRow.setAttribute('data-index', rowIndex);
    
    // Create field dropdown
    const fieldColDiv = document.createElement('div');
    fieldColDiv.className = 'col-md-5';
    
    const fieldSelect = document.createElement('select');
    fieldSelect.className = 'form-select filter-field';
    fieldSelect.innerHTML = '<option value="">-- Select Field --</option>';
    
    // Add fields to dropdown
    for (const field of vaultClient.objectFields) {
        const option = document.createElement('option');
        option.value = field.name;
        option.textContent = field.name;
        fieldSelect.appendChild(option);
    }
    
    fieldSelect.addEventListener('change', updateQuery);
    fieldColDiv.appendChild(fieldSelect);
    
    // Create operator dropdown
    const operatorColDiv = document.createElement('div');
    operatorColDiv.className = 'col-md-2';
    
    const operatorSelect = document.createElement('select');
    operatorSelect.className = 'form-select filter-operator';
    
    const operators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'CONTAINS'];
    for (const op of operators) {
        const option = document.createElement('option');
        option.value = op;
        option.textContent = op;
        operatorSelect.appendChild(option);
    }
    
    operatorSelect.addEventListener('change', updateQuery);
    operatorColDiv.appendChild(operatorSelect);
    
    // Create value input
    const valueColDiv = document.createElement('div');
    valueColDiv.className = 'col-md-4';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'form-control filter-value';
    valueInput.placeholder = 'Value';
    valueInput.addEventListener('input', updateQuery);
    valueColDiv.appendChild(valueInput);
    
    // Create remove button for all but the first row
    const btnColDiv = document.createElement('div');
    btnColDiv.className = 'col-md-1';
    
    if (rowIndex > 0) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'btn btn-sm btn-danger';
        removeButton.innerHTML = '<i class="fas fa-minus"></i>';
        removeButton.addEventListener('click', function() {
            removeFilterRow(filterRow);
        });
        btnColDiv.appendChild(removeButton);
    }
    
    // Append to filter row
    filterRow.appendChild(fieldColDiv);
    filterRow.appendChild(operatorColDiv);
    filterRow.appendChild(valueColDiv);
    filterRow.appendChild(btnColDiv);
    
    // Add to container
    filtersContainer.appendChild(filterRow);
    
    logDebug(`Added filter row ${rowIndex + 1}`);
}

// Remove filter row
function removeFilterRow(filterRow) {
    filtersContainer.removeChild(filterRow);
    
    // Update data-index attributes
    const filterRows = document.querySelectorAll('.filter-row');
    for (let i = 0; i < filterRows.length; i++) {
        filterRows[i].setAttribute('data-index', i);
    }
    
    logDebug(`Removed filter row`);
    
    // Update query
    updateQuery();
}

// Update query
function updateQuery() {
    if (!vaultClient.currentObject) {
        return;
    }
    
    // Get selected fields
    let fields = vaultClient.selectedFields;
    if (fields.length === 0) {
        fields = ['id'];
    }
    
    // Get filter clauses
    const filterClauses = [];
    const filterRows = document.querySelectorAll('.filter-row');
    
    for (const row of filterRows) {
        const fieldSelect = row.querySelector('.filter-field');
        const operatorSelect = row.querySelector('.filter-operator');
        const valueInput = row.querySelector('.filter-value');
        
        const field = fieldSelect.value;
        const operator = operatorSelect.value;
        const value = valueInput.value.trim();
        
        if (field && operator) {
            // Format value based on operator
            if (operator && value) {
                if (operator in ['=', '!=', '>', '<', '>=', '<=', 'LIKE']) {
                    // Check if value is numeric
                    if (/^-?\d+(\.\d+)?$/.test(value)) {
                        filterClauses.push(`${field} ${operator} ${value}`);
                    } else {
                        // Use quotes for non-numeric values
                        filterClauses.push(`${field} ${operator} '${value}'`);
                    }
                } else if (operator === 'IN') {
                    const values = value.split(',').map(v => v.trim());
                    const formattedValues = values.map(v => {
                        if (/^-?\d+(\.\d+)?$/.test(v)) {
                            return v;
                        } else {
                            return `'${v}'`;
                        }
                    });
                    
                    filterClauses.push(`${field} IN (${formattedValues.join(', ')})`);
                } else if (operator === 'CONTAINS') {
                    const values = value.split(',').map(v => v.trim());
                    const formattedValues = values.map(v => {
                        if (/^-?\d+(\.\d+)?$/.test(v)) {
                            return v;
                        } else {
                            return `'${v}'`;
                        }
                    });
                    
                    filterClauses.push(`${field} CONTAINS (${formattedValues.join(', ')})`);
                }
            }
        }
    }
    
    // Get sort field and direction
    const sortField = sortFieldSelect.value;
    const sortDirection = sortDirectionSelect.value;
    const nullsPosition = nullsPositionSelect.value;
    
    // Get max records
    let maxRecords = 1000;
    try {
        maxRecords = parseInt(maxRecordsInput.value);
        if (isNaN(maxRecords) || maxRecords < 1) {
            maxRecords = 1000;
        }
    } catch (error) {
        maxRecords = 1000;
    }
    
    // Build the query
    let query = `SELECT ${fields.join(', ')}\nFROM ${vaultClient.currentObject}`;
    
    // Add WHERE clause if there are filters
    if (filterClauses.length > 0) {
        query += `\nWHERE ${filterClauses.join(' AND ')}`;
    }
    
    // Add ORDER BY clause if a sort field is selected
    if (sortField) {
        query += `\nORDER BY ${sortField} ${sortDirection} ${nullsPosition}`;
    }
    
    // Add PAGESIZE clause
    query += `\nPAGESIZE ${maxRecords}`;
    
    // Update query text
    queryText.value = query;
    
    logDebug(`Query updated: ${query}`);
}

// Execute query
function executeQuery() {
    const query = queryText.value.trim();
    
    if (!query) {
        showAlert(resultsStatus, 'danger', 'No query to execute');
        return;
    }
    
    statusMessage.textContent = 'Executing query...';
    
    logDebug(`Executing query: ${query}`);
    
    executeVqlQuery(query)
        .then(function(response) {
            updateResults(response);
            
            // Get record count
            if (response.data) {
                const count = response.data.length;
                const total = response.responseDetails?.total || count;
                logDebug(`Query executed successfully. Retrieved ${count} of ${total} records.`);
                statusMessage.textContent = `Query executed successfully. Retrieved ${count} of ${total} records.`;
            } else {
                logDebug('Query executed successfully but returned no data.');
                statusMessage.textContent = 'Query executed successfully.';
            }
            
            // Switch to Results tab
            document.getElementById('results-tab-btn').click();
        })
        .catch(function(error) {
            const errorMsg = `Failed to execute query: ${error.message}`;
            logDebug(errorMsg);
            statusMessage.textContent = 'Query execution failed';
            showAlert(resultsStatus, 'danger', errorMsg);
        });
}

// Export query to CSV
function exportQueryToCsv() {
    const query = queryText.value.trim();
    
    if (!query) {
        showAlert(resultsStatus, 'danger', 'No query to execute');
        return;
    }
    
    statusMessage.textContent = 'Executing query and exporting to CSV...';
    
    logDebug(`Executing query and exporting to CSV: ${query}`);
    
    executeVqlQuery(query)
        .then(function(response) {
            if (response.data && response.data.length > 0) {
                // Convert to CSV
                const csv = convertToCSV(response.data);
                
                // Create download link
                downloadFile(csv, 'query_results.csv', 'text/csv');
                
                logDebug(`Exported ${response.data.length} records to CSV`);
                statusMessage.textContent = 'Query executed and exported successfully.';
            } else {
                const errorMsg = 'No data found in query response';
                logDebug(errorMsg);
                statusMessage.textContent = 'Export failed: No data found';
                showAlert(resultsStatus, 'danger', errorMsg);
            }
        })
        .catch(function(error) {
            const errorMsg = `Failed to execute query: ${error.message}`;
            logDebug(errorMsg);
            statusMessage.textContent = 'Query execution failed';
            showAlert(resultsStatus, 'danger', errorMsg);
        });
}

// Update results
function updateResults(data) {
    try {
        // Update results text
        const timestamp = new Date().toLocaleString();
        resultsText.textContent = `Query executed: ${timestamp}\n\n${JSON.stringify(data, null, 2)}`;
        
        // Update results table
        updateResultsTable(data);
        
        // Update status info
        if (data.responseDetails) {
            const total = data.responseDetails.total || 0;
            const size = data.responseDetails.size || 0;
            resultsStatus.innerHTML = `<div class="alert alert-info">Retrieved ${size} of ${total} records</div>`;
        }
        
        logDebug('Results updated successfully');
    } catch (error) {
        const errorMsg = `Exception updating results: ${error.message}`;
        logDebug(errorMsg);
        logDebug(error.stack);
        showAlert(resultsStatus, 'danger', errorMsg);
    }
}

// Update results table
function updateResultsTable(data) {
    try {
        // Clear table
        const tableHead = resultsTable.querySelector('thead tr');
        const tableBody = resultsTable.querySelector('tbody');
        
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        
        // Check if data is empty
        if (!data.data || data.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="100%" class="text-center py-3">No data to display</td></tr>';
            return;
        }
        
        // Get headers from first result
        const headers = Object.keys(data.data[0]);
        
        // Create header cells
        for (const header of headers) {
            const headerCell = document.createElement('th');
            headerCell.textContent = header;
            tableHead.appendChild(headerCell);
        }
        
        // Create rows
        for (const row of data.data) {
            const tableRow = document.createElement('tr');
            
            for (const header of headers) {
                const cell = document.createElement('td');
                let value = row[header];
                
                if (value === null || value === undefined) {
                    value = '';
                } else if (typeof value !== 'string') {
                    value = String(value);
                }
                
                // Truncate long values
                if (value.length > 100) {
                    cell.title = value;
                    value = value.substring(0, 97) + '...';
                }
                
                cell.textContent = value;
                tableRow.appendChild(cell);
            }
            
            tableBody.appendChild(tableRow);
        }
        
        logDebug(`Results table updated with ${data.data.length} rows`);
    } catch (error) {
        const errorMsg = `Exception updating results table: ${error.message}`;
        logDebug(errorMsg);
        logDebug(error.stack);
        showAlert(resultsStatus, 'danger', errorMsg);
    }
}

// Export results
function exportResults() {
    try {
        const resultText = resultsText.textContent.trim();
        
        if (!resultText) {
            showAlert(resultsStatus, 'danger', 'No results to export');
            return;
        }
        
        // Find where JSON starts
        const jsonStartIndex = resultText.indexOf('{');
        if (jsonStartIndex >= 0) {
            const jsonText = resultText.substring(jsonStartIndex);
            const data = JSON.parse(jsonText);
            
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                // Convert to CSV
                const csv = convertToCSV(data.data);
                
                // Create download link
                downloadFile(csv, 'query_results.csv', 'text/csv');
                
                logDebug(`Exported results to CSV`);
                showAlert(resultsStatus, 'success', 'Results exported to CSV file');
            } else {
                const errorMsg = 'No data found in results';
                logDebug(errorMsg);
                showAlert(resultsStatus, 'danger', errorMsg);
            }
        } else {
            const errorMsg = 'No valid JSON data found in results';
            logDebug(errorMsg);
            showAlert(resultsStatus, 'danger', errorMsg);
        }
    } catch (error) {
        const errorMsg = `Failed to export results: ${error.message}`;
        logDebug(errorMsg);
        logDebug(error.stack);
        showAlert(resultsStatus, 'danger', errorMsg);
    }
}

// Copy to clipboard
function copyToClipboard() {
    const resultText = resultsText.textContent.trim();
    
    if (resultText) {
        navigator.clipboard.writeText(resultText)
            .then(function() {
                showAlert(resultsStatus, 'success', 'Results copied to clipboard');
                logDebug('Results copied to clipboard');
            })
            .catch(function(error) {
                const errorMsg = `Failed to copy: ${error.message}`;
                logDebug(errorMsg);
                showAlert(resultsStatus, 'danger', errorMsg);
            });
    } else {
        showAlert(resultsStatus, 'danger', 'No results to copy');
    }
}

// Clear results
function clearResults() {
    resultsText.textContent = '';
    
    // Clear table
    const tableHead = resultsTable.querySelector('thead tr');
    const tableBody = resultsTable.querySelector('tbody');
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Clear status
    resultsStatus.innerHTML = '';
    
    logDebug('Results cleared');
    showAlert(resultsStatus, 'info', 'Results cleared');
}

// Convert data to CSV
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header] === null || row[header] === undefined ? '' : row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// Download file
function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

// Show alert message
function showAlert(element, type, message) {
    element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);
