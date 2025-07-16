const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const STORAGE_KEY = 'eazi-calculator-history';
const LAST_RESULT_KEY = 'eazi-calculator-last-result';
let lastResult = null;

function evaluateExpression(expression) {
    try {
        if (!expression || expression.trim() === '') {
            return null;
        }

        expression = expression.replace(/×/g, '*')
                              .replace(/÷/g, '/')
                              .replace(/:/g, '/')
                              .replace(/\s+/g, '');
        
        if (/^[+\-*/]/.test(expression) && lastResult !== null) {
            expression = 'x' + expression;
        }
        
        if (expression.includes('x') && lastResult !== null) {
            expression = expression.replace(/x/g, lastResult.toString());
        } else if (expression.includes('x') && lastResult === null) {
            return null;
        }

        if (!/^[0-9+\-*/.]+$/.test(expression)) {
            return null;
        }

        return calculateExpression(expression);
    } catch (e) {
        console.log(`evaluateExpression: ${e}`);
        return null;
    }
}

function formatNumber(num) {
    return num.toString();
}

function addMessage(content, isUser = false, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}${isError ? ' error-message' : ''}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (!isUser && !isError) {
        contentDiv.classList.add('calculation-result');
    }

    contentDiv.innerHTML = content;
    messageDiv.appendChild(contentDiv);

    if (isUser && !isError && content.includes('=')) {
        contentDiv.style.cursor = 'pointer';
        contentDiv.addEventListener('click', function() {
            const match = content.match(/^(.+?)\s*=\s*([0-9.-]+)$/);
            if (match) {
                chatInput.value = match[1].trim();
                chatInput.focus();
            }
        });
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    saveHistory();
}

function saveHistory() {
    const messages = [];
    const messageElements = chatMessages.querySelectorAll('.message:not(.welcome-message .message)');
    
    messageElements.forEach(messageEl => {
        const content = messageEl.querySelector('.message-content').innerHTML;
        const isUser = messageEl.classList.contains('user-message');
        const isError = messageEl.classList.contains('error-message');
        
        messages.push({ content, isUser, isError });
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function loadHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const messages = JSON.parse(saved);
            messages.forEach(msg => {
                addMessageWithoutSaving(msg.content, msg.isUser, msg.isError);
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

    if (isUser && !isError && content.includes('=')) {
        contentDiv.style.cursor = 'pointer';
        contentDiv.addEventListener('click', function() {
            const match = content.match(/^(.+?)\s*=\s*([0-9.-]+)$/);
            if (match) {
                chatInput.value = match[1].trim();
                chatInput.focus();
            }
        });
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
        addMessage('Lỗi: Phép tính không hợp lệ', false, true);
    }

    chatInput.value = '';
    chatInput.focus();
}

function getLastResultBeforeThis() {
    const messages = chatMessages.querySelectorAll('.message.user-message:not(.error-message)');
    if (messages.length === 0) return null;
    
    for (let i = messages.length - 1; i >= 0; i--) {
        const content = messages[i].querySelector('.message-content').innerHTML;
        const match = content.match(/=\s*([0-9.-]+)$/);
        if (match) {
            return parseFloat(match[1]);
        }
    }
    return null;
}

function clearChat() {
    const messages = chatMessages.querySelectorAll('.message:not(.welcome-message .message)');
    messages.forEach(message => message.remove());
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
    try {
        let operators = [];
        let operands = [];
        let currentNumber = '';
        
        for (let i = 0; i < expr.length; i++) {
            const char = expr[i];
            
            if (char >= '0' && char <= '9' || char === '.') {
                currentNumber += char;
            } else if (['+', '-', '*', '/'].includes(char)) {
                if (currentNumber === '') {
                    if (char === '-' && operands.length === 0) {
                        currentNumber = '-';
                        continue;
                    }
                    return null;
                }
                
                operands.push(parseFloat(currentNumber));
                currentNumber = '';
                
                while (operators.length > 0 && 
                       getPrecedence(operators[operators.length - 1]) >= getPrecedence(char)) {
                    const result = performOperation(operands, operators);
                    if (result === null) return null;
                }
                
                operators.push(char);
            } else {
                return null;
            }
        }
        
        if (currentNumber !== '') {
            operands.push(parseFloat(currentNumber));
        }
        
        while (operators.length > 0) {
            const result = performOperation(operands, operators);
            if (result === null) return null;
        }
        
        return operands.length === 1 ? operands[0] : null;
    } catch (e) {
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
    if (operands.length < 2 || operators.length === 0) {
        return null;
    }
    
    const b = operands.pop();
    const a = operands.pop();
    const op = operators.pop();
    
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
            if (b === 0) return null;
            result = a / b;
            break;
        default:
            return null;
    }
    
    operands.push(result);
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

window.addEventListener('load', function() {
    loadHistory();
    loadLastResult();
    chatInput.focus();
});
