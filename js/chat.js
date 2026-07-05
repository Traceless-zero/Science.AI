let chatContainer, chatInput;

// ========== 初始化聊天事件（首页加载完成后调用） ==========
function initChatEvents() {
    chatContainer = document.querySelector('#chat-container .max-w-3xl');
    chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', handleEnter);
    }
}

// ========== 快捷发送 ==========
function quickSend(text) {
    if (!chatInput) return;
    chatInput.value = text;
    sendMessage();
}

// ========== 回车发送 ==========
function handleEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// ========== 发送消息 ==========
function sendMessage() {
    if (!chatInput || !chatContainer) return;
    const text = chatInput.value.trim();
    if (!text) return;

    addUserMessage(text);
    chatInput.value = '';

    setTimeout(() => {
        const mode = document.querySelector('input[name="mode"]:checked').value;
        if (mode === 'search') addSearchResult(text);
        else if (mode === 'check') addCheckResult();
        else addAIMessage(text);
    }, 600);

    scrollToBottom();
}

// ========== 添加用户消息 ==========
function addUserMessage(text) {
    const html = `
        <div class="flex items-start space-x-3 justify-end">
            <div class="max-w-[80%]">
                <div class="font-medium text-sm mb-1 text-right">你</div>
                <div class="bg-primary text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed">${text}</div>
            </div>
            <div class="w-8 h-8 rounded-full bg-primary text-white flex-shrink-0 flex items-center justify-center text-xs font-bold">张</div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', html);
}

// ========== 普通 AI 回复 ==========
function addAIMessage(userText) {
    const html = `
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">AI</div>
            <div class="flex-1 max-w-[85%]">
                <div class="font-medium text-sm mb-1">Science.AI 学术助手</div>
                <div class="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-700 leading-relaxed">
                    针对「${userText}」这个问题，我先从学术角度为你梳理核心脉络：
                    <br><br>
                    1. <strong>核心概念界定</strong>：该议题的主流定义包含三个层面……
                    <br>
                    2. <strong>经典研究脉络</strong>：该领域先后经历了三次范式转向……
                    <br>
                    3. <strong>当前争议焦点</strong>：目前学界的核心分歧集中在前提假设与方法论两个维度……
                    <br><br>
                    如果你需要更深入的文献支撑，可以切换到「论文检索」模式，我会为你匹配相关的学术文献并生成结构化摘要。
                </div>
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

// ========== 论文检索结果 ==========
function addSearchResult(keyword) {
    const html = `
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">AI</div>
            <div class="flex-1 max-w-[90%]">
                <div class="font-medium text-sm mb-1">Science.AI 学术助手 · 论文检索</div>
                <div class="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-700 leading-relaxed">
                    已为你检索到与「<strong>${keyword}</strong>」相关的高被引文献 126 篇，以下是 Top 5 核心结果：
                    <div class="mt-4 space-y-3">
                        <div class="bg-white border border-gray-200 rounded-lg p-3">
                            <div class="font-medium text-primary hover:underline cursor-pointer">Information Theory and Evolutionary Biology: A Unified Framework</div>
                            <div class="text-xs text-gray-500 mt-1">Smith J. et al. · Nature Reviews Genetics · 2023 · 被引 487 次</div>
                            <div class="text-xs text-gray-600 mt-2">提出了生物演化的信息熵模型，量化了遗传信息积累与熵减的对应关系，是该领域奠基性文献。</div>
                            <div class="flex space-x-3 mt-2 text-xs text-secondary">
                                <span class="cursor-pointer hover:underline">查看摘要</span>
                                <span class="cursor-pointer hover:underline">原文链接</span>
                                <span class="cursor-pointer hover:underline">相似文献</span>
                            </div>
                        </div>
                        <div class="bg-white border border-gray-200 rounded-lg p-3">
                            <div class="font-medium text-primary hover:underline cursor-pointer">Directionality in Evolution: Thermodynamic Constraints on Adaptive Walks</div>
                            <div class="text-xs text-gray-500 mt-1">Chen L., Wang H. · PNAS · 2022 · 被引 312 次</div>
                            <div class="text-xs text-gray-600 mt-2">通过计算机模拟验证了在开放系统中，演化路径存在统计意义上的定向性，对现代综合进化论形成了重要补充。</div>
                            <div class="flex space-x-3 mt-2 text-xs text-secondary">
                                <span class="cursor-pointer hover:underline">查看摘要</span>
                                <span class="cursor-pointer hover:underline">原文链接</span>
                                <span class="cursor-pointer hover:underline">相似文献</span>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 text-xs text-gray-500">
                        数据来源：arXiv, PubMed, Semantic Scholar, OpenAlex 等开放学术数据库。如需生成完整文献综述或知识图谱，请继续说明。
                    </div>
                </div>
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

// ========== 质检结果 ==========
function addCheckResult() {
    const html = `
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">AI</div>
            <div class="flex-1 max-w-[90%]">
                <div class="font-medium text-sm mb-1">Science.AI 学术助手 · 论证质检报告</div>
                <div class="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-700 leading-relaxed">
                    <div class="bg-white border border-gray-200 rounded-lg p-4">
                        <div class="font-semibold mb-3">📋 论证形式质检报告（仅核查形式，不评判观点正误）</div>
                        <div class="space-y-3 text-xs">
                            <div>
                                <div class="flex justify-between mb-1"><span>论证完整性</span><span class="text-green-600">良好 · 6/6 要素齐全</span></div>
                                <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-green-500 h-1.5 rounded-full" style="width: 85%"></div></div>
                            </div>
                            <div>
                                <div class="flex justify-between mb-1"><span>证据基础</span><span class="text-amber-600">待完善 · 3处无来源断言</span></div>
                                <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-amber-500 h-1.5 rounded-full" style="width: 62%"></div></div>
                            </div>
                            <div>
                                <div class="flex justify-between mb-1"><span>可证伪性</span><span class="text-green-600">明确 · 给出证伪条件</span></div>
                                <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-green-500 h-1.5 rounded-full" style="width: 80%"></div></div>
                            </div>
                            <div>
                                <div class="flex justify-between mb-1"><span>边界意识</span><span class="text-red-500">需注意 · 2处过度泛化表述</span></div>
                                <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-red-400 h-1.5 rounded-full" style="width: 45%"></div></div>
                            </div>
                        </div>
                        <div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
                            <p>⚠️ 主要问题提示：</p>
                            <p>1. 第 3 章第 2 节存在 2 处全称判断，未限定适用范围，建议补充边界条件</p>
                            <p>2. 第 5 页有 3 项事实性陈述未标注文献来源，建议补充证据支撑</p>
                            <p>3. 整体论证链条完整，核心逻辑自洽，具备可证伪性</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

// ========== 滚动到底部 ==========
function scrollToBottom() {
    const container = document.getElementById('chat-container');
    if (container) container.scrollTop = container.scrollHeight;
}

// ========== 新建对话 ==========
function newChat() {
    if (!chatContainer) return;
    chatContainer.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">AI</div>
                <div class="flex-1">
                    <div class="font-medium text-sm mb-1">Science.AI 学术助手</div>
                    <div class="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-700 leading-relaxed">
                        新对话已开启。我可以帮你完成论证质检、论文检索、文献综述、思想对谈等学术工作，请问有什么可以帮你的？
                    </div>
                </div>
            </div>
        </div>
    `;
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active', 'bg-blue-50', 'text-primary');
        item.classList.add('text-gray-700');
    });
}

// ========== 加载历史对话 ==========
function loadChat(id) {
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active', 'bg-blue-50', 'text-primary');
        item.classList.add('text-gray-700', 'hover:bg-gray-100');
    });
    event.currentTarget.classList.add('active', 'bg-blue-50', 'text-primary');
    event.currentTarget.classList.remove('text-gray-700', 'hover:bg-gray-100');
    
    if (id === 2) {
        chatContainer.innerHTML = '';
        quickSend('熵增定律与生物演化相关论文');
    } else {
        newChat();
    }
}