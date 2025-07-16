const historyContainer = document.getElementById('historyContainer');
const chatInput = document.getElementById('chatInput');
const STORAGE_KEY = 'eazi-calculator-history';
const LAST_RESULT_KEY = 'eazi-calculator-last-result';
let lastResult = null;

// Debug mode toggle
let DEBUG_MODE = false;

function debug(...args) {
    if (DEBUG_MODE) {
        console.log('🐛 DEBUG:', ...args);
    }
}

function toggleDebug() {
    DEBUG_MODE = !DEBUG_MODE;
    console.log(`🔧 Debug mode: ${DEBUG_MODE ? 'ON' : 'OFF'}`);
    return DEBUG_MODE;
}

function evaluateExpression(expression) {
    debug('evaluateExpression called with:', expression);
    
    try {
        if (!expression || expression.trim() === '') {
            debug('Empty expression, returning null');
            return null;
        }

        const originalExpression = expression;
        expression = expression.replace(/×/g, '*')
                              .replace(/÷/g, '/')
                              .replace(/:/g, '/')
                              .replace(/\s+/g, '');
        
        debug('After symbol replacement:', expression);
        
        if (/^[+\-*/]/.test(expression) && lastResult !== null) {
            expression = 'x' + expression;
            debug('Auto-prepended x:', expression);
        }
        
        if (expression.includes('x') && lastResult !== null) {
            const beforeX = expression;
            expression = expression.replace(/x/g, lastResult.toString());
            debug('Replaced x with lastResult:', beforeX, '->', expression);
        } else if (expression.includes('x') && lastResult === null) {
            debug('Expression contains x but no lastResult, returning null');
            return null;
        }

        if (!/^[0-9+\-*/.()]+$/.test(expression)) {
            debug('Invalid characters in expression, returning null');
            return null;
        }

        debug('About to calculate:', expression);
        const result = calculateExpression(expression);
        debug('Calculation result:', result);
        
        return result;
    } catch (e) {
        debug(`evaluateExpression error: ${e}`);
        return null;
    }
}

function formatNumber(num) {
    // Round to 12 decimal places to avoid floating point precision issues
    const rounded = Math.round(num * 1000000000000) / 1000000000000;
    return rounded.toString();
}

function addMessage(content, isUser = false, isError = false) {
    if (isUser && !isError && content.includes('=')) {
        addCalculationCard(content);
    } else if (isError) {
        addErrorMessage(content);
    } else {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}${isError ? ' error-message' : ''}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (!isUser && !isError) {
            contentDiv.classList.add('calculation-result');
        }

        contentDiv.innerHTML = content;
        messageDiv.appendChild(contentDiv);

        historyContainer.appendChild(messageDiv);
        historyContainer.scrollTop = historyContainer.scrollHeight;
    }
    
    saveHistory();
}

function addCalculationCard(calculation) {
    const match = calculation.match(/^(.+?)\s*=\s*([0-9.-]+)$/);
    if (!match) return;

    const expression = match[1].trim();
    const result = match[2].trim();

    const cardDiv = document.createElement('div');
    cardDiv.className = 'calculation-card';

    const expressionDiv = document.createElement('div');
    expressionDiv.className = 'calculation-expression';
    expressionDiv.textContent = expression;

    const resultDiv = document.createElement('div');
    resultDiv.className = 'calculation-result';
    resultDiv.textContent = result;

    cardDiv.appendChild(expressionDiv);
    cardDiv.appendChild(resultDiv);

    cardDiv.addEventListener('click', function() {
        chatInput.value = expression;
        chatInput.focus();
    });

    historyContainer.appendChild(cardDiv);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

function addErrorMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message error-message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = content;

    messageDiv.appendChild(contentDiv);
    historyContainer.appendChild(messageDiv);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

function saveHistory() {
    const messages = [];
    const messageElements = historyContainer.querySelectorAll('.message:not(.welcome-message .message)');
    const cardElements = historyContainer.querySelectorAll('.calculation-card');
    
    messageElements.forEach(messageEl => {
        const content = messageEl.querySelector('.message-content').innerHTML;
        const isUser = messageEl.classList.contains('user-message');
        const isError = messageEl.classList.contains('error-message');
        
        messages.push({ content, isUser, isError, type: 'message' });
    });
    
    cardElements.forEach(cardEl => {
        const expression = cardEl.querySelector('.calculation-expression').textContent;
        const result = cardEl.querySelector('.calculation-result').textContent;
        
        messages.push({ 
            expression: expression, 
            result: result, 
            type: 'card' 
        });
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function loadHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const messages = JSON.parse(saved);
            messages.forEach(msg => {
                if (msg.type === 'card') {
                    addCalculationCardDirectly(msg.expression, msg.result);
                } else if (msg.isUser && msg.content && msg.content.includes('=')) {
                    // Handle old format calculations
                    const match = msg.content.match(/^(.+?)\s*=\s*([0-9.-]+)$/);
                    if (match) {
                        addCalculationCardDirectly(match[1].trim(), match[2].trim());
                    }
                } else if (!msg.isUser || msg.isError) {
                    addMessageWithoutSaving(msg.content, msg.isUser, msg.isError);
                }
            });
        }
    } catch (e) {
        console.log('Error loading history:', e);
    }
}

function addMessageWithoutSaving(content, isUser = false, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}${isError ? ' error-message' : ''}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (!isUser && !isError) {
        contentDiv.classList.add('calculation-result');
    }

    contentDiv.innerHTML = content;
    messageDiv.appendChild(contentDiv);

    historyContainer.appendChild(messageDiv);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

function addCalculationCardWithoutSaving(calculation) {
    const match = calculation.match(/^(.+?)\s*=\s*([0-9.-]+)$/);
    if (!match) return;

    const expression = match[1].trim();
    const result = match[2].trim();

    addCalculationCardDirectly(expression, result);
}

function addCalculationCardDirectly(expression, result) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'calculation-card';

    const expressionDiv = document.createElement('div');
    expressionDiv.className = 'calculation-expression';
    expressionDiv.textContent = expression;

    const resultDiv = document.createElement('div');
    resultDiv.className = 'calculation-result';
    resultDiv.textContent = result;

    cardDiv.appendChild(expressionDiv);
    cardDiv.appendChild(resultDiv);

    cardDiv.addEventListener('click', function() {
        chatInput.value = expression;
        chatInput.focus();
    });

    historyContainer.appendChild(cardDiv);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

function sendMessage() {
    const expression = chatInput.value.trim();

    if (!expression) return;

    let processedExpression = expression;
    
    if (/^[+\-*/]/.test(expression) && lastResult !== null) {
        processedExpression = 'x' + expression;
    }

    const result = evaluateExpression(expression);

    if (result !== null) {
        lastResult = result;
        localStorage.setItem(LAST_RESULT_KEY, result.toString());
        
        let displayExpression = processedExpression;
        if (displayExpression.includes('x')) {
            const prevResult = getLastResultBeforeThis();
            if (prevResult !== null) {
                displayExpression = displayExpression.replace(/x/g, prevResult.toString());
            }
        }
        
        addMessage(`${displayExpression} = ${formatNumber(result)}`, true);
    } else {
        addMessage(`${expression}`, true);
        addMessage('Error: Invalid calculation', false, true);
    }

    chatInput.value = '';
    chatInput.focus();
}

function getLastResultBeforeThis() {
    const cards = historyContainer.querySelectorAll('.calculation-card');
    if (cards.length === 0) return null;
    
    for (let i = cards.length - 1; i >= 0; i--) {
        const resultText = cards[i].querySelector('.calculation-result').textContent;
        if (resultText) {
            return parseFloat(resultText);
        }
    }
    return null;
}

function clearChat() {
    const messages = historyContainer.querySelectorAll('.message:not(.welcome-message .message)');
    const cards = historyContainer.querySelectorAll('.calculation-card');
    messages.forEach(message => message.remove());
    cards.forEach(card => card.remove());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_RESULT_KEY);
    lastResult = null;
    chatInput.focus();
}

chatInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
        event.preventDefault();
    }
});

document.getElementById('sendButton').addEventListener('click', sendMessage);
document.getElementById('clearButton').addEventListener('click', clearChat);

function calculateExpression(expr) {
    debug('calculateExpression called with:', expr);
    
    try {
        let operators = [];
        let operands = [];
        let currentNumber = '';
        
        debug('Starting tokenization...');
        
        for (let i = 0; i < expr.length; i++) {
            const char = expr[i];
            debug(`Processing char '${char}' at position ${i}`);
            
            if (char >= '0' && char <= '9' || char === '.') {
                currentNumber += char;
                debug(`Building number: '${currentNumber}'`);
            } else if (char === '(') {
                if (currentNumber !== '') {
                    if (currentNumber === '-') {
                        // Special case: -(expression) = -1 * (expression)
                        operands.push(-1);
                        operators.push('*');
                        debug(`Added -1 * for negative expression`);
                    } else {
                        // Only add implicit multiply if we have a number before (
                        // Examples: 2(3+4) should become 2*(3+4)
                        operands.push(parseFloat(currentNumber));
                        operators.push('*');
                        debug(`Added operand: ${currentNumber}, implicit multiply`);
                    }
                    currentNumber = '';
                }
                operators.push('(');
                debug(`Added opening parenthesis`);
            } else if (char === ')') {
                if (currentNumber !== '') {
                    operands.push(parseFloat(currentNumber));
                    debug(`Added operand: ${currentNumber}`);
                    currentNumber = '';
                }
                
                debug(`Processing closing parenthesis, operators: [${operators.join(', ')}]`);
                
                while (operators.length > 0 && operators[operators.length - 1] !== '(') {
                    debug(`Performing operation while closing parenthesis`);
                    const result = performOperation(operands, operators);
                    if (result === null) return null;
                }
                
                if (operators.length === 0) {
                    debug(`No matching opening parenthesis found`);
                    return null;
                }
                operators.pop();
                debug(`Removed opening parenthesis`);
                
                // No implicit multiplication after closing parenthesis
                // Let explicit operators handle themselves
            } else if (['+', '-', '*', '/'].includes(char)) {
                if (currentNumber === '') {
                    // Allow negative numbers ONLY at start, after (, or after operators (not after operands)
                    if (char === '-') {
                        const lastOp = operators[operators.length - 1];
                        // Only allow negative number if we don't have multiple operands waiting
                        if ((operands.length === 0 || lastOp === '(' || 
                            lastOp === '+' || lastOp === '-' || lastOp === '*' || lastOp === '/') &&
                            !(operands.length > 1 && operators.length < operands.length)) {
                            currentNumber = '-';
                            debug(`Starting negative number`);
                            continue;
                        }
                    }
                    
                    // Check if we have operands to work with (valid after closing parenthesis)
                    if (operands.length === 0) {
                        debug(`Invalid operator placement: ${char}`);
                        return null;
                    }
                    
                    // Valid operator after operands (e.g., after closing parenthesis)
                    debug(`Valid operator after operands: ${char}`);
                } else {
                    // We have a currentNumber to push
                    operands.push(parseFloat(currentNumber));
                    debug(`Added operand: ${currentNumber}`);
                    currentNumber = '';
                }
                
                debug(`Processing operator '${char}', current operators: [${operators.join(', ')}]`);
                
                while (operators.length > 0 && 
                       operators[operators.length - 1] !== '(' &&
                       getPrecedence(operators[operators.length - 1]) >= getPrecedence(char)) {
                    debug(`Performing operation due to precedence`);
                    const result = performOperation(operands, operators);
                    if (result === null) return null;
                }
                
                operators.push(char);
                debug(`Added operator: ${char}`);
            } else {
                debug(`Invalid character: ${char}`);
                return null;
            }
            
            debug(`Current state - operands: [${operands.join(', ')}], operators: [${operators.join(', ')}]`);
        }
        
        if (currentNumber !== '') {
            operands.push(parseFloat(currentNumber));
            debug(`Added final operand: ${currentNumber}`);
        }
        
        debug(`Final processing - operands: [${operands.join(', ')}], operators: [${operators.join(', ')}]`);
        
        while (operators.length > 0) {
            if (operators[operators.length - 1] === '(') {
                debug(`Unmatched opening parenthesis`);
                return null;
            }
            debug(`Performing final operation`);
            const result = performOperation(operands, operators);
            if (result === null) return null;
        }
        
        const finalResult = operands.length === 1 ? operands[0] : null;
        debug(`Final result: ${finalResult}`);
        
        return finalResult;
    } catch (e) {
        debug(`calculateExpression error: ${e}`);
        return null;
    }
}

function getPrecedence(operator) {
    switch (operator) {
        case '+':
        case '-':
            return 1;
        case '*':
        case '/':
            return 2;
        default:
            return 0;
    }
}

function performOperation(operands, operators) {
    debug('performOperation called');
    debug(`Before operation - operands: [${operands.join(', ')}], operators: [${operators.join(', ')}]`);
    
    if (operands.length < 2 || operators.length === 0) {
        debug('Not enough operands or operators');
        return null;
    }
    
    const b = operands.pop();
    const a = operands.pop();
    const op = operators.pop();
    
    debug(`Performing: ${a} ${op} ${b}`);
    
    let result;
    switch (op) {
        case '+':
            result = a + b;
            break;
        case '-':
            result = a - b;
            break;
        case '*':
            result = a * b;
            break;
        case '/':
            if (b === 0) {
                debug('Division by zero detected');
                return null;
            }
            result = a / b;
            break;
        default:
            debug(`Unknown operator: ${op}`);
            return null;
    }
    
    debug(`Operation result: ${result}`);
    operands.push(result);
    debug(`After operation - operands: [${operands.join(', ')}], operators: [${operators.join(', ')}]`);
    
    return result;
}

function loadLastResult() {
    try {
        const saved = localStorage.getItem(LAST_RESULT_KEY);
        if (saved) {
            lastResult = parseFloat(saved);
        }
    } catch (e) {
        console.log('Error loading last result:', e);
    }
}

// Test cases for calculator
const testCases = [
    // Basic operations
    { input: '2+3', expected: 5 },
    { input: '10-4', expected: 6 },
    { input: '6*7', expected: 42 },
    { input: '15/3', expected: 5 },
    
    // Operator precedence
    { input: '2+3*4', expected: 14 },
    { input: '10-6/2', expected: 7 },
    { input: '2*3+4', expected: 10 },
    { input: '8/2-1', expected: 3 },
    
    // Parentheses
    { input: '(2+3)*4', expected: 20 },
    { input: '10/(2+3)', expected: 2 },
    { input: '(10-5)*(3+2)', expected: 25 },
    { input: '2*(3+4)', expected: 14 },
    
    // Decimals
    { input: '0.1+0.2', expected: 0.3 },
    { input: '1.5*2', expected: 3 },
    { input: '7.5/2.5', expected: 3 },
    
    // Negative numbers
    { input: '-5+3', expected: -2 },
    { input: '-(2+3)', expected: -5 },
    { input: '10*-2', expected: -20 },
    { input: '-1*5', expected: -5 },
    { input: '3+-2', expected: 1 },
    
    // Complex expressions
    { input: '(2+3)*(4-1)', expected: 15 },
    { input: '10/(2+3)-1', expected: 1 },
    { input: '2+(3*4)-5', expected: 9 },
    { input: '(1+5)*2', expected: 12 },
    { input: '3*(2+4)', expected: 18 },
    
    // Edge cases
    { input: '0*5', expected: 0 },
    { input: '0/5', expected: 0 },
    { input: '5-5', expected: 0 },
];

function runTests() {
    console.log('🧪 Running Calculator Tests...');
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach((test, index) => {
        const result = evaluateExpression(test.input);
        const expected = test.expected;
        
        // Handle floating point comparison and null results
        const isEqual = result !== null && Math.abs(result - expected) < 1e-10;
        
        if (isEqual) {
            console.log(`✅ Test ${index + 1}: ${test.input} = ${result} (expected: ${expected})`);
            passed++;
        } else {
            console.log(`❌ Test ${index + 1}: ${test.input} = ${result} (expected: ${expected})`);
            failed++;
            
            // Quick debug for specific failed cases
            if (test.input === '10/(2+3)-1' || test.input === '2+(3*4)-5') {
                console.log(`🔍 Debug trace for ${test.input}:`);
                const oldDebug = DEBUG_MODE;
                DEBUG_MODE = true;
                evaluateExpression(test.input);
                DEBUG_MODE = oldDebug;
            }
        }
    });
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('🎉 All tests passed!');
    } else {
        console.log(`⚠️  ${failed} test(s) failed`);
    }
    
    return { passed, failed };
}

// Add test and debug buttons in development
function addTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test';
    testButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 5px 10px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        z-index: 9999;
        font-size: 12px;
    `;
    testButton.onclick = runTests;
    document.body.appendChild(testButton);
}

function addDebugButton() {
    const debugButton = document.createElement('button');
    debugButton.textContent = 'Debug';
    debugButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 70px;
        padding: 5px 10px;
        background: #ffc107;
        color: black;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        z-index: 9999;
        font-size: 12px;
    `;
    debugButton.onclick = toggleDebug;
    document.body.appendChild(debugButton);
}

window.addEventListener('load', function() {
    loadHistory();
    loadLastResult();
    chatInput.focus();
    
    // Add development buttons (uncomment for development)
    // addTestButton();
    // addDebugButton();
});
