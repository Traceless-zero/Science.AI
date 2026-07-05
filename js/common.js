tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#1e40af',
                secondary: '#3b82f6',
                proSide: '#2563eb', // 正方蓝色
                conSide: '#dc2626', // 反方红色
                dark: '#111827'
            }
        }
    }
}

// ========== 全局变量 ==========
const pageCache = {}; // 页面缓存，已加载过的页面直接复用
const mainContainer = document.getElementById('app-main');
let currentTab = null;

//加载和配置PDF.js
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null;
let currentPage = 1;
let totalPage = 0;
// 基础缩放，无自动压缩逻辑
let scale = 1.0;
let canvas, ctx, pageNumEl, pageTotalEl, btnPrev, btnNext;
const DPR = window.devicePixelRatio || 1;

// 页面初始化
function initPaperView() {
    canvas = document.getElementById('pdf-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    pageNumEl = document.getElementById('page-num');
    pageTotalEl = document.getElementById('page-total');
    btnPrev = document.getElementById('btn-prev');
    btnNext = document.getElementById('btn-next');
}

// 加载项目内置静态PDF
function loadStaticPdf() {
    const pdfUrl = "/Science.AI-demo/papers/demo.pdf";
    pdfjsLib.getDocument(pdfUrl).promise.then(doc => {
        pdfDoc = doc;
        totalPage = doc.numPages;
        pageTotalEl.textContent = totalPage;
        currentPage = 1;
        scale = 1.0;
        renderSinglePage(currentPage);
    }).catch(err => {
        console.error("PDF加载失败", err);
    });
}

// 翻页
function prevPage() {
    if (currentPage <= 1) return;
    currentPage--;
    renderSinglePage(currentPage);
}
function nextPage() {
    if (currentPage >= totalPage) return;
    currentPage++;
    renderSinglePage(currentPage);
}

// 计算PDF单页在容器内的自适应缩放比（保证高清，不低于1.0）
function getFitScale(page) {
    const container = document.getElementById('pdf-canvas').parentElement.parentElement;
    const containerWidth = container.clientWidth - 32;
    const containerHeight = container.clientHeight - 32;
    
    const viewport = page.getViewport({ scale: 1.0 });
    const scaleW = containerWidth / viewport.width;
    const scaleH = containerHeight / viewport.height;
    
    // 取较小值，但绝对不能低于1.0，保证高清渲染
    return Math.max(1.0, Math.min(scaleW, scaleH));
}

// 渲染单页PDF（容器自适应PDF比例，高清抗模糊）
function renderSinglePage(pageNum) {
    pdfDoc.getPage(pageNum).then(page => {
        // 1. 以scale=1.0获取原始尺寸viewport（保证高清基础）
        const baseViewport = page.getViewport({ scale: 1.0 });
        
        // 2. 获取容器可用宽度（去掉padding 16px*2）
        const container = document.getElementById('pdf-container');
        const maxWidth = container.clientWidth - 32;
        
        // 3. 计算：让PDF宽度填满容器时，对应的scale
        //    这个scale可能大于1（高清）也可能小于1（超大PDF），但始终用这个精度渲染
        scale = maxWidth / baseViewport.width;
        
        // 4. 用计算出的scale获取渲染用的viewport
        const viewport = page.getViewport({ scale: scale });
        
        // 5. Canvas物理像素（高清）
        canvas.width = viewport.width * DPR;
        canvas.height = viewport.height * DPR;
        
        // 6. Canvas CSS显示尺寸 = 逻辑像素
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        // 7. 重置画笔 + 高清缩放
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        
        // 8. 渲染
        const renderTask = page.render({
            canvasContext: ctx,
            viewport: viewport
        });
        
        renderTask.promise.then(() => {
            // 9. ★ 关键：把容器高度同步为canvas显示高度
            container.style.height = `${viewport.height + 32}px`;  // +32是上下padding
            
            pageNumEl.textContent = pageNum;
            btnPrev.disabled = pageNum <= 1;
            btnNext.disabled = pageNum >= totalPage;
        });
    });
}


// 跳转作者主页
function jumpBackScholar(scholarId) {
    switchTab("profile");
}


// ========== 页面初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    // 默认加载首页
    switchTab('home');
    // 绑定导航按钮事件
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // 点击页面空白处关闭所有下拉面板
    document.addEventListener('click', function(e) {
        // 1. 关闭用户菜单：点击不在用户菜单容器内就关闭
        const userWrap = document.getElementById('user-menu-wrap');
        const userMenu = document.getElementById('user-menu');
        if (userWrap && userMenu && !userWrap.contains(e.target)) {
            userMenu.classList.add('hidden');
        }

        // 2. 关闭通知面板：点击不在通知容器内就关闭
        const notifyWrap = document.getElementById('notification-wrap');
        const notifyPanel = document.getElementById('notification-panel');
        if (notifyWrap && notifyPanel && !notifyWrap.contains(e.target)) {
            notifyPanel.classList.add('hidden');
        }
    });
});

// 自定义页面导航历史栈，支持 SPA 页面回退
const tabHistory = [];

function switchTab(tabName) {
    if (currentTab === tabName) return;

    // 记录导航历史（将当前页面压入历史栈）
    if (currentTab) {
        // 避免连续压入相同页面或重复记录
        if (tabHistory.length === 0 || tabHistory[tabHistory.length - 1] !== currentTab) {
            tabHistory.push(currentTab);
        }
    }

    currentTab = tabName;

    // 更新导航激活状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('nav-active');
        btn.classList.add('text-gray-600');
    });
    const activeBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('nav-active');
        activeBtn.classList.remove('text-gray-600');
    }

    // 从缓存取或加载新页面
    if (pageCache[tabName]) {
        mainContainer.innerHTML = pageCache[tabName];
        initPage(tabName);
    } else {
        mainContainer.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><i class="fa fa-spinner fa-spin mr-2"></i>加载中...</div>';
        fetch(`pages/${tabName}.html`)
            .then(res => res.text())
            .then(html => {
                pageCache[tabName] = html;
                mainContainer.innerHTML = html;
                initPage(tabName);
            })
            .catch(err => {
                mainContainer.innerHTML = '<div class="w-full h-full flex items-center justify-center text-red-500">页面加载失败，请检查文件路径</div>';
                console.error('页面加载错误：', err);
            });
    }
}

function goBack() {
    if (tabHistory.length === 0) {
        // 没有历史记录，跳转到首页或什么都不做
        switchTab('home');
        return;
    }
    // 从历史栈中弹出上一个页面名称
    const prevTab = tabHistory.pop();
    // 跳转回上一个页面
    switchTab(prevTab);
}

// 当前激活的新闻分类标识
let activeNewsTab = "all";
// Tab字段与Mock标签映射
const newsTabMap = {
    all: "全部",
    break: "领域突破",
    experiment: "实验证实",
    policy: "学术政策",
    nobel: "诺奖资讯",
    conference: "学术会议"
};

// 切换分类标签，刷新新闻列表
function switchNewsTab(tabName) {
    // 更新全局激活分类
    activeNewsTab = tabName;

    // 切换按钮激活样式
    const tabBtns = document.querySelectorAll("#news-view [data-tab]");
    tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.className = "px-4 py-1 rounded bg-blue-600 text-white text-sm hover:opacity-90";
        } else {
            btn.className = "px-4 py-1 rounded border text-sm hover:bg-gray-50";
        }
    });

    // 重新渲染过滤后的新闻卡片
    renderNewsList();
}

// 渲染新闻列表（核心过滤逻辑在这里）
function renderNewsList() {
    const wrap = document.getElementById("news-card-wrap");
    if (!wrap || !window.MOCK_DATA?.newsList) return;
    const allNews = window.MOCK_DATA.newsList;
    // 根据当前选中分类过滤数据
    let filteredNews = [];
    if (activeNewsTab === "all") {
        // 全部分类：展示所有新闻
        filteredNews = allNews;
    } else {
        // 匹配对应tag的新闻条目
        const targetTag = newsTabMap[activeNewsTab];
        filteredNews = allNews.filter(item => item.category === targetTag);
    }

    // 拼接卡片HTML
    let html = "";
    filteredNews.forEach(item => {
        html += `
        <div class="bg-white rounded-lg border border-gray-200 p-5 min-h-[220px] flex flex-col justify-between">
            <div>
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">${item.category}</span>
                    <span class="text-xs text-gray-400">${item.date}</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600" onclick="jumpToNews(${item.id})">${item.title}</h3>
                <p class="text-sm text-gray-600 line-clamp-4">${item.summary}</p>
            </div>
            <p class="text-xs text-gray-400 mt-3">${item.source}</p>
        </div>
        `;
    });
    wrap.innerHTML = html;
}

// 跳转新闻页面，打开对应新闻详情
function jumpToNews(newsId) {
    switchTab("news");
    setTimeout(() => {
        openNewsDetail(newsId);
    }, 120);
}


// ========== 通知面板开关 ==========
function toggleNotification() {
    const panel = document.getElementById('notification-panel');
    panel.classList.toggle('hidden');
    // 打开时渲染列表
    if (!panel.classList.contains('hidden')) {
        renderNotifications();
    }
}

// ========== 页面加载后初始化 ==========
function initPage(tabName) {
    // 兜底：如果数据还没加载，延迟100ms再执行
    if (typeof MOCK_DATA === 'undefined') {
        setTimeout(() => initPage(tabName), 100);
        return;
    }

    switch(tabName) {
        //主页
        case 'home':
            renderChatHistory();
            initChatEvents();
            break;
        //民间投稿
        case 'submission':
            renderSubmissions();
            break;
        //自由论坛
        case 'forum':
            renderForumList();
            break;
        //学术辩论
        case 'debate':
            renderDebateList();
            break;
        //新闻资讯
        case 'news':
            renderNewsList();
            break;
        //期刊分区
        case 'journal':
            renderJournalList();
            break;
        //学者归档
        case 'archive':
            renderArchive();
            break;
        //个人主页
        case 'profile':
            renderMySubmissions();
            //个人主页页面自动渲染用户数据
            openUserProfile();
            break;
            //论文详情
            case 'paper':
                setTimeout(() => {
                    initPaperView();
                    // DOM初始化完毕，直接加载对应论文
                    if(window.currentOpenPaperId) {
                        openPaperDetail(window.currentOpenPaperId);
                    }
                }, 25);
            break;
    }
}


// ========== 用户下拉菜单 ==========
function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    menu.classList.toggle('hidden');
}

// ========== 移动端侧边栏切换 ==========
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('absolute');
    sidebar.classList.toggle('z-40');
    sidebar.classList.toggle('h-full');
}

// ========== 数据渲染：AI助手对话历史 ==========
function renderChatHistory() {
    const container = document.getElementById('chat-history-container');
    if (!container) return;

    const demoItems = [
        { id: 1,  icon: 'fa-search',        title: '文献检索' },
        { id: 2,  icon: 'fa-file-text-o',   title: '论文摘要' },
        { id: 3,  icon: 'fa-list-alt',      title: '文献综述辅助' },
        { id: 4,  icon: 'fa-check-circle',  title: '论文质检' },
        { id: 5,  icon: 'fa-lightbulb-o',   title: '头脑风暴' },
        { id: 6,  icon: 'fa-commenting',    title: '模拟审稿' },
        { id: 7,  icon: 'fa-pencil',        title: '学术写作润色' },
        { id: 8,  icon: 'fa-bar-chart',     title: '数据解读' },
        { id: 9,  icon: 'fa-bullhorn',      title: '学术热点追踪' },
        { id: 10, icon: 'fa-heart-o',       title: '学术压力疏导' }
    ];

    let html = '<div class="text-xs text-gray-400 px-2 py-2 font-medium">功能演示列表</div>';

    demoItems.forEach(item => {
        html += `
            <div class="demo-item px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 text-sm text-gray-700 mb-0.5 transition-colors"
                 data-id="${item.id}"
                 onclick="showDemoChat(${item.id})">
                <i class="fa ${item.icon} mr-2 text-xs text-gray-400"></i>
                <span>${item.title}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}


// ========== AI助手演示对话数据与逻辑 ==========

const demoChats = {
    1: {
        title: '文献检索',
        tag: '文献检索',
        user: '帮我找几篇关于CRISPR在农业育种中应用的近三年论文。',
        ai: '已检索到5篇相关论文。Top 3推荐：<br><br>① 《CRISPR-mediated crop improvement: recent advances》(Nature Plants, 2025) — 引用187次<br>② 《Multiplex genome editing in rice》(Plant Biotechnology Journal, 2024) — 引用134次<br>③ 《Ethical frameworks for agricultural gene editing》(Trends in Biotechnology, 2025) — 引用89次<br><br>需要我生成这几篇的知识卡片吗？'
    },
    2: {
        title: '论文摘要',
        tag: '论文摘要',
        user: '这篇30页的论文太长了，给我一个快速概览。',
        ai: '已生成知识卡片。<br><br>📌 核心问题：气候变化如何影响全球小麦蛋白质含量？<br>📌 核心结论：大气CO₂浓度每增加100ppm，小麦籽粒蛋白质含量下降约6.3%<br>📌 关键证据：基于12国28个站点的20年田间试验数据<br>📌 局限声明：未涵盖非洲主要小麦产区<br><br>需要深入了解哪一部分？'
    },
    3: {
        title: '文献综述辅助',
        tag: '文献综述',
        user: '我在写关于深度学习在医学影像中应用的综述，帮我理一下这个领域。',
        ai: '已梳理研究脉络，大致分为三个阶段：<br><br>📌 2015-2018：CNN在X光片分类中超越人类放射科医生<br>📌 2019-2022：迁移学习和自监督学习降低标注依赖，多模态模型出现<br>📌 2023至今：基础模型成为主流，挑战转向"可解释性"和"分布外泛化"<br><br>⚠️ 当前主要空白：前瞻性临床试验不足，罕见病数据依然稀缺。'
    },
    4: {
        title: '论文质检',
        tag: '论文质检',
        user: '帮我检查一下这篇论文，我总觉得哪里不太对。',
        ai: '已完成初步质检。发现3个需注意的点：<br><br>⚠️ 第4页表2：实验组与对照组的标准差完全一致（±3.8），极不寻常<br>⚠️ 第7页图3C：与作者2024年某论文的图5B存在89%像素重叠，疑似复用<br>⚠️ 第12页：声称"与Smith et al.(2023)结论一致"，但Smith原文结论方向有实质差异<br><br>以上仅为初步形式检查，不构成最终判定。如需完整的正式质检报告，请提交至预印本投稿区，系统将自动生成多维度质检报告并附于论文页。'
    },
    5: {
        title: '头脑风暴',
        tag: '头脑风暴',
        user: '我研究蜜蜂的导航机制，想找一些跨领域的研究灵感。',
        ai: '几个可能的方向：<br><br>💡 计算机视觉：SLAM算法与蜜蜂回巢路径惊人相似<br>💡 材料科学：蜜蜂复眼抗反射结构→新型太阳能电池表面设计<br>💡 语言学：蜜蜂"8字舞"的方言差异，算不算符号学现象？<br>💡 网络理论：蜂群决策建模为分布式共识算法<br><br>哪个方向你最感兴趣？'
    },
    6: {
        title: '模拟审稿',
        tag: '模拟审稿',
        user: '我的论文准备投了，先模拟一下审稿。核心发现：A药物在细胞实验中能抑制B蛋白。',
        ai: '以审稿人视角提问：<br><br>🔍 细胞模型是HeLa还是原代细胞？HeLa的B蛋白表达与体内差异较大<br>🔍 A药物的特异性如何？是否测试了对B蛋白家族其他成员的交叉作用？<br>🔍 药物浓度能否在人体内达到药理学有效浓度？<br><br>如果浓度不可达，临床转化前景存疑。建议投稿前完善这些实验。'
    },
    7: {
        title: '学术写作润色',
        tag: '写作润色',
        user: '这段文字帮我校对润色一下，顺便把逻辑理清楚。',
        ai: '已完成润色：<br><br>✅ 术语一致性修改3处<br>✅ 语法修正2处（主谓不一致）<br>✅ 逻辑过渡补充1处（第二段与第三段之间）<br><br>整体评价：原文论证思路清晰，主要问题已修正。'
    },
    8: {
        title: '数据解读',
        tag: '数据解读',
        user: '三个实验组数据：12.3±2.1、18.7±3.4、25.2±4.8。帮我看看规律。',
        ai: '已分析：<br><br>📊 三组呈线性增长趋势（R²=0.97）<br>📊 剂量-效应关系明显<br>⚠️ 标准差随剂量增大（2.1→4.8），高剂量组个体差异大，建议检查异常值<br><br>提示：建议追加中间剂量点验证线性假设。'
    },
    9: {
        title: '学术热点追踪',
        tag: '热点追踪',
        user: '最近有什么值得关注的新研究吗？',
        ai: '近期动态：<br><br>🔥 Nature上周发表用AlphaFold3预测RNA结构的论文<br>🔥 Smith教授团队在arXiv上质疑AlphaFold3在某些RNA预测上的准确性<br>🔥 本月热门关键词："single-cell multi-omics"<br><br>论坛里已有三篇讨论帖，需要汇总吗？'
    },
    10: {
        title: '学术压力疏导',
        tag: '压力疏导',
        user: '四个月的实验，最后发现样本被污染了，所有数据都用不了。',
        ai: '我能感受到你的沮丧。四个月的心血被一次污染清零，这种感觉太难受了。<br><br>你不是机器，你是正常的科研工作者，不是出了问题不会难过的工具。<br><br>如果你想聊聊接下来怎么办——从头重复实验？调整方案？或者先给自己放两天假——我随时在这里。'
    }
};

function showDemoChat(id) {
    const chat = demoChats[id];
    if (!chat) return;

    const welcomeView = document.getElementById('welcome-view');
    const demoView = document.getElementById('demo-view');
    if (!welcomeView || !demoView) return;

    welcomeView.classList.add('hidden');
    demoView.classList.remove('hidden');

    demoView.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-start space-x-3 justify-end">
                <div class="flex-1 text-right">
                    <div class="font-medium text-sm mb-1 text-gray-600">你</div>
                    <div class="bg-primary text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm inline-block text-left max-w-[80%]">
                        ${chat.user}
                    </div>
                </div>
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 text-xs font-bold">张</div>
            </div>
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">AI</div>
                <div class="flex-1">
                    <div class="font-medium text-sm mb-1">Science.AI 学术助手</div>
                    <div class="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-700 leading-relaxed">
                        ${chat.ai}
                    </div>
                    <span class="inline-block mt-2 text-xs px-2 py-0.5 bg-blue-50 text-primary rounded">#${chat.tag}</span>
                </div>
            </div>
        </div>
    `;

    // 高亮当前选中的功能项
    document.querySelectorAll('.demo-item').forEach(item => {
        item.classList.remove('bg-blue-50', 'text-primary', 'font-medium');
    });
    const activeItem = document.querySelector(`.demo-item[data-id="${id}"]`);
    if (activeItem) {
        activeItem.classList.add('bg-blue-50', 'text-primary', 'font-medium');
    }
}

function resetChatView() {
    const welcomeView = document.getElementById('welcome-view');
    const demoView = document.getElementById('demo-view');
    if (welcomeView) welcomeView.classList.remove('hidden');
    if (demoView) demoView.classList.add('hidden');
    document.querySelectorAll('.demo-item').forEach(item => {
        item.classList.remove('bg-blue-50', 'text-primary', 'font-medium');
    });
}

// 收起/展开侧边栏
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const isHidden = sidebar.style.display === 'none';

    if (isHidden) {
        // 打开侧边栏
        sidebar.style.display = '';
        // 移除展开按钮
        const expandBtn = document.getElementById('expand-sidebar-btn');
        if (expandBtn) expandBtn.remove();
    } else {
        // 收起侧边栏
        sidebar.style.display = 'none';
        // 避免重复创建
        if (document.getElementById('expand-sidebar-btn')) return;

        // 在主聊天区的父容器上创建展开按钮
        const homeSection = document.getElementById('home-view');
        if (!homeSection) return;

        const btn = document.createElement('button');
        btn.id = 'expand-sidebar-btn';
        btn.className = 'absolute left-3 top-3 z-10 w-8 h-8 flex items-center justify-center rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 shadow-sm';
        btn.innerHTML = '<i class="fa fa-bars text-sm"></i>';
        btn.onclick = toggleSidebar;
        homeSection.style.position = 'relative';
        homeSection.appendChild(btn);
    }
}

// ========== 数据渲染：独立投稿列表 ==========
function renderSubmissions() {
    const container = document.getElementById('submission-list');
    if (!container) return;
    let html = '';
    MOCK_DATA.submissions.forEach(item => {
        let statusColor, statusIcon;
        if (item.status === 'pass') {
            statusColor = 'text-green-600';
            statusIcon = 'fa-check-circle';
        } else if (item.status === 'flagged') {
            statusColor = 'text-orange-600';
            statusIcon = 'fa-exclamation-circle';
        } else {
            // fail
            statusColor = 'text-red-600';
            statusIcon = 'fa-times-circle';
        }
        html += `
            <div class="bg-white border border-gray-200 rounded-lg p-5 card-hover">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">${item.category}</span>
                            <span class="text-xs text-gray-400">${item.date}</span>
                            <span class="text-xs ${statusColor}"><i class="fa ${statusIcon} mr-1"></i>${item.statusText}</span>
                        </div>
                        <h3 onclick="jumpToPaper(${item.paperId})";" class="text-lg font-semibold mb-2 hover:text-secondary cursor-pointer">${item.title}</h3>
                        <p class="text-sm text-gray-600 line-clamp-2 mb-3">${item.abstract}</p>
                        <div class="flex items-center space-x-4 text-xs text-gray-500">
                            <span>作者：${item.authorType} · ${item.author}</span>
                            <!-- <span><i class="fa fa-thumbs-o-up mr-1"></i> ${item.stats.agree} 附议</span> -->
                            <span><i class="fa fa-comment-o mr-1"></i> ${item.stats.comment} 评论</span>
                            <span><i class="fa fa-eye mr-1"></i> ${item.stats.view} 阅读</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ========== 学术辩论：渲染一级列表 ==========
function renderDebateList() {
    const listView = document.getElementById("debate-list-view");
    const detailView = document.getElementById("debate-detail-view");
    const focusWrap = document.getElementById("debate-focus-card");
    const runningWrap = document.getElementById("debate-running-container");
    const waitWrap = document.getElementById("debate-wait-container");
    const archiveWrap = document.getElementById("debate-archive-container");

    // 全局防御：任意DOM缺失直接退出，不报错
    if (!listView || !detailView || !focusWrap || !runningWrap || !waitWrap || !archiveWrap) return;

    // 切换视图：显示列表，隐藏详情
    listView.classList.remove("hidden");
    detailView.classList.add("hidden");

    const data = MOCK_DATA.debateData;
    if (!data) return;

    // 1、渲染学术焦点通栏卡片
    const focus = data.focus;
    focusWrap.innerHTML = `
        <div class="md:w-2/3">
            <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">${focus.category}</span>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-3">${focus.title}</h3>
            <p class="text-sm text-gray-600 mb-4 line-clamp-2">${focus.desc}</p>
            <div class="flex items-center gap-6 text-sm mb-4 flex-wrap">
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-proSide"></span>
                    <span class="text-proSide font-medium">正方：哥本哈根学派</span>
                    <span class="text-gray-500 text-xs">${focus.proScholars}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-conSide"></span>
                    <span class="text-conSide font-medium">反方：定域实在论</span>
                    <span class="text-gray-500 text-xs">${focus.conScholars}</span>
                </div>
            </div>
            <div class="flex gap-5 text-xs text-gray-500 flex-wrap">
                <span><i class="fa fa-users mr-1"></i>${focus.scholarCount}位顶尖学者参与</span>
                <span><i class="fa fa-file-text-o mr-1"></i>${focus.roundCount}轮完整攻防</span>
                <span><i class="fa fa-eye mr-1"></i>${focus.viewCount}次查阅</span>
            </div>
        </div>
        <div class="md:w-1/3 flex items-center justify-center">
            <div class="w-20 h-20 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center font-bold text-gray-600 text-xl">VS</div>
        </div>
    `;

    // 2、渲染正在交锋卡片
    let runningHtml = "";
    if (Array.isArray(data.running)) {
        data.running.forEach(item => {
            runningHtml += `
            <div class="bg-white border border-gray-200 rounded-lg p-4 card-hover cursor-pointer" onclick="openDebateDetail(${item.id})">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-medium text-gray-900">${item.title}</h4>
                    <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">${item.status}</span>
                </div>
                <div class="grid grid-cols-3 gap-3 items-center border-t border-gray-100 pt-3">
                    <div class="text-center">
                        <div class="text-proSide font-medium text-sm mb-1">正方</div>
                        <p class="text-xs text-gray-500 line-clamp-2">${item.proDesc}</p>
                        <div class="mt-2 text-xs text-proSide">支持 ${item.proPercent}%</div>
                    </div>
                    <div class="flex justify-center">
                        <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">VS</div>
                    </div>
                    <div class="text-center">
                        <div class="text-conSide font-medium text-sm mb-1">反方</div>
                        <p class="text-xs text-gray-500 line-clamp-2">${item.conDesc}</p>
                        <div class="mt-2 text-xs text-conSide">支持 ${item.conPercent}%</div>
                    </div>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                    <span>共${item.roundCount}轮交锋</span>
                    <span class="text-primary">查看详情</span>
                </div>
            </div>
            `;
        });
    }
    runningWrap.innerHTML = runningHtml || "<div class='text-center py-12 text-gray-400'>暂无正在交锋辩论</div>";

    // 3、渲染待招募辩题
    let waitHtml = "";
    if (Array.isArray(data.wait)) {
        data.wait.forEach(item => {
            waitHtml += `
            <div onclick="switchTab('recruit-detail')" class="bg-white border border-dashed border-gray-300 rounded-lg p-4 card-hover cursor-pointer" onclick="openDebateDetail(${item.id})">
                <h4 class="text-sm font-medium text-gray-900 mb-2">${item.title}</h4>
                <p class="text-xs text-gray-600 mb-3 line-clamp-2">${item.desc}</p>
                <div class="text-xs text-orange-500">招募中 · 已有${item.signCount}位学者报名</div>
            </div>
            `;
        });
    }
    waitWrap.innerHTML = waitHtml || "<div class='text-center py-12 text-gray-400'>暂无招募辩题</div>";

    // 4、渲染论战归档
    let archiveHtml = "";
    if (Array.isArray(data.archive)) {
        data.archive.forEach(item => {
            archiveHtml += `
            <div class="bg-white border border-gray-200 rounded-lg p-4 card-hover cursor-pointer" onclick="openDebateDetail(${item.id})">
                <div class="flex justify-between mb-2">
                    <span class="text-xs px-1.5 py-0.5 bg-gray-100 rounded">${item.category}</span>
                    <span class="text-xs text-gray-400">已归档</span>
                </div>
                <h4 class="text-sm font-medium line-clamp-2 mb-3">${item.title}</h4>
                <div class="text-xs mb-2">
                    <span class="text-proSide">正方：</span>
                    <span class="text-gray-600">${item.proScholars}</span>
                </div>
                <div class="text-xs mb-3">
                    <span class="text-conSide">反方：</span>
                    <span class="text-gray-600">${item.conScholars}</span>
                </div>
                <div class="text-xs text-gray-500">${item.scholarCount}位学者 · ${item.roundCount}轮交锋</div>
            </div>
            `;
        });
    }
    archiveWrap.innerHTML = archiveHtml || "<div class='col-span-full text-center py-12 text-gray-400'>暂无归档论战</div>";

    document.querySelector(".page-content").scrollTop = 0;
}

// ========== 学术辩论：打开详情页 ==========
function openDebateDetail(id) {
    const listView = document.getElementById('debate-list-view');
    const detailView = document.getElementById('debate-detail-view');
    const detail = MOCK_DATA.debateDetail[id];

    // 防御性判断：元素不存在直接返回，避免报错
    if (!listView || !detailView || !detail) return;

    // 先切换视图，确保DOM可见
    listView.classList.add('hidden');
    detailView.classList.remove('hidden');

    // 头部基础信息
    const titleEl = document.getElementById('debate-title');
    if (titleEl) titleEl.textContent = detail.title;
    const statusEl = document.getElementById('debate-status');
    if (statusEl) statusEl.textContent = detail.status;
    const subtitleEl = document.getElementById('debate-subtitle');
    if (subtitleEl) subtitleEl.textContent = detail.subtitle;
    const scholarCountEl = document.getElementById('debate-scholar-count');
    if (scholarCountEl) scholarCountEl.textContent = detail.scholarCount;
    const viewCountEl = document.getElementById('debate-view-count');
    if (viewCountEl) viewCountEl.textContent = detail.viewCount;
    const roundCountEl = document.getElementById('debate-round-count');
    if (roundCountEl) roundCountEl.textContent = detail.roundCount;
    const bgEl = document.getElementById('debate-background');
    if (bgEl) bgEl.textContent = detail.background;
    const proPercentEl = document.getElementById('debate-pro-percent');
    if (proPercentEl) proPercentEl.textContent = detail.proPercent;
    const conPercentEl = document.getElementById('debate-con-percent');
    if (conPercentEl) conPercentEl.textContent = detail.conPercent;
    const proBarEl = document.getElementById('debate-pro-bar');
    if (proBarEl) proBarEl.style.width = detail.proPercent + '%';
    const conBarEl = document.getElementById('debate-con-bar');
    if (conBarEl) conBarEl.style.width = detail.conPercent + '%';

    // 双方立场
    const proScholarsEl = document.getElementById('pro-scholars');
    if (proScholarsEl) proScholarsEl.textContent = detail.proScholars;
    const conScholarsEl = document.getElementById('con-scholars');
    if (conScholarsEl) conScholarsEl.textContent = detail.conScholars;
    const proStandpointEl = document.getElementById('pro-standpoint');
    if (proStandpointEl) {
        proStandpointEl.innerHTML = detail.proStandpoint.map((item, i) => `<p>${i+1}. ${item}</p>`).join('');
    }
    const conStandpointEl = document.getElementById('con-standpoint');
    if (conStandpointEl) {
        conStandpointEl.innerHTML = detail.conStandpoint.map((item, i) => `<p>${i+1}. ${item}</p>`).join('');
    }

    // 交锋回合渲染
    const roundContainer = document.getElementById('debate-round-container');
    if (roundContainer) {
        let roundHtml = '';
        detail.rounds.forEach(item => {
            let tagClass = item.side === 'pro' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600';
            let contentHtml = item.content.map(p => `<p>${p}</p>`).join('');

            roundHtml += `
    <div class="bg-white border border-gray-200 rounded-lg p-5 card-hover ${item.side === 'pro' ? 'border-l-4 border-proSide' : 'border-l-4 border-conSide'}">
        <div class="flex items-start space-x-4">
            <div class="w-10 h-10 rounded-full ${item.avatarColor} text-white flex items-center justify-center font-medium flex-shrink-0">
                ${item.name.charAt(0)}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center flex-wrap gap-2 mb-2">
                    <span class="font-medium text-gray-800">${item.name}</span>
                    <span class="text-xs text-gray-500">${item.org}</span>
                    <span class="text-xs px-1.5 py-0.5 ${tagClass} rounded">${item.side === 'pro' ? '正方' : '反方'} · ${item.type}</span>
                    <span class="text-xs text-gray-400 ml-auto">第 ${item.round} 轮 · ${item.date}</span>
                </div>
                <div class="text-sm text-gray-700 leading-relaxed mb-3 space-y-2">
                    ${contentHtml}
                </div>
                <div class="bg-gray-50 rounded p-3 border border-gray-100 cursor-pointer hover:border-secondary transition-colors" onclick="openJournalDetail(${item.paper.journalId})">
                    <div class="text-xs text-gray-500 mb-1">关联${item.type}依据</div>
                    <div class="text-sm font-medium text-gray-800 mb-1">${item.paper.title}</div>
                    <div class="text-xs text-gray-500 flex items-center justify-between">
                        <span>${item.paper.info}</span>
                        <span class="text-primary">查看论文 →</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;
        });
        roundContainer.innerHTML = roundHtml;
    }

    // 滚动到顶部
    const pageContent = document.querySelector('.page-content');
    if (pageContent) pageContent.scrollTop = 0;
}


// 辩论招募详情页：前置探索 / 后置对抗 模式切换
function switchRecruitMode(mode) {
    var exploreView = document.getElementById('recruit-explore-view');
    var conflictView = document.getElementById('recruit-conflict-view');
    var tabExplore = document.getElementById('tab-explore');
    var tabConflict = document.getElementById('tab-conflict');

    if (!exploreView || !conflictView || !tabExplore || !tabConflict) return;

    if (mode === 'explore') {
        exploreView.classList.remove('hidden');
        conflictView.classList.add('hidden');
        tabExplore.className = 'px-4 py-1.5 bg-primary text-white transition-colors';
        tabConflict.className = 'px-4 py-1.5 bg-white text-gray-600 hover:bg-gray-50 transition-colors';
    } else {
        exploreView.classList.add('hidden');
        conflictView.classList.remove('hidden');
        tabExplore.className = 'px-4 py-1.5 bg-white text-gray-600 hover:bg-gray-50 transition-colors';
        tabConflict.className = 'px-4 py-1.5 bg-primary text-white transition-colors';
    }
}

// ========== 返回列表 ==========
function closeDebateDetail() {
    const listView = document.getElementById("debate-list-view");
    const detailView = document.getElementById("debate-detail-view");
    if (!listView || !detailView) return;

    detailView.classList.add("hidden");
    listView.classList.remove("hidden");
}

// ========== 数据渲染：论坛帖子 ==========
function renderForumList() {
    // 和页面ID严格对应：forum-list-view / forum-detail-view
    const listPanel = document.getElementById("forum-list-view");
    const detailPanel = document.getElementById("forum-detail-view");
    const cardWrap = document.getElementById("forum-card-wrap");

    // 防御判断：任意容器不存在直接终止，杜绝null报错
    if (!listPanel || !detailPanel || !cardWrap) return;

    listPanel.classList.remove("hidden");
    detailPanel.classList.add("hidden");

    const postArr = MOCK_DATA.forumPosts;
    if (!Array.isArray(postArr)) {
        cardWrap.innerHTML = "<div class='text-center py-12 text-gray-400'>暂无帖子</div>";
        return;
    }

    let html = "";
    postArr.forEach(item => {
        // 头像背景色
        const avatarBg = item.avatar || "bg-gray-200";
        // 标签DOM（有tags才渲染）
        let tagHtml = "";
        if (item.tags && item.tags.length > 0) {
            item.tags.forEach(tag => {
                tagHtml += `<span class="text-xs px-2 py-0.5 bg-gray-100 rounded mr-2">${tag}</span>`;
            });
        }
        // 关联辩论标识（有linkDebateId才渲染）
        let debateTip = "";
        if (item.linkDebateId) {
            debateTip = `<span class="text-xs text-primary mr-2">关联辩论</span>`;
        }

        html += `
        <div onclick="openForumDetail(${item.id})" class="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer card-hover">
            <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-full ${avatarBg} flex-shrink-0 flex items-center justify-center text-sm">
                    ${item.avatarChar ?? item.author.charAt(0)}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        ${debateTip}
                        <h4 class="font-medium text-gray-900 line-clamp-1">${item.title}</h4>
                    </div>
                    <div class="text-xs text-gray-500 mb-2">
                        ${item.author} · ${item.category} · ${item.time}
                    </div>
                    ${tagHtml ? `<div class="mb-2">${tagHtml}</div>` : ""}
                    <p class="text-sm text-gray-600 line-clamp-2">${item.content}</p>
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                <span>点赞 ${item.stats.like} · 回复 ${item.stats.reply}</span>
                <span class="text-primary">查看全文</span>
            </div>
        </div>
        `;
    });

    cardWrap.innerHTML = html;
    const pageBox = document.querySelector(".page-content");
    if (pageBox) pageBox.scrollTop = 0;
}

// ========== 数据渲染：打开帖子详情 ==========
function openForumDetail(pid) {
    const listPanel = document.getElementById("forum-list-view");
    const detailPanel = document.getElementById("forum-detail-view");
    const detailWrap = document.getElementById("forum-detail-container");
    const data = MOCK_DATA.forumPostDetail[pid];

    if (!listPanel || !detailPanel || !detailWrap || !data) return;

    listPanel.classList.add("hidden");
    detailPanel.classList.remove("hidden");

    // 下面原有详情渲染逻辑不变
    let tagDom = "";
    if (data.tags && data.tags.length > 0) {
        data.tags.forEach(tag => tagDom += `<span class="text-xs px-2 py-0.5 bg-gray-100 rounded mr-2">${tag}</span>`);
    }

    let commentDom = "";
    if (data.commentList && data.commentList.length > 0) {
        data.commentList.forEach(cm => {
            commentDom += `
            <div class="flex gap-3 py-3 border-b border-gray-100">
                <div class="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs">${cm.avatarChar}</div>
                <div>
                    <div class="text-xs text-gray-500 mb-1">${cm.name} · ${cm.institute} ${cm.time}</div>
                    <p class="text-sm text-gray-700">${cm.text}</p>
                </div>
            </div>
            `;
        });
    }

    let debateJump = "";
    if (data.linkDebateId) { 
        debateJump = `<button onclick="jumpDebateFromPost(${data.linkDebateId})" class="text-primary hover:underline ml-4">跳转关联辩论：${data.linkDebateTitle}</button>`;
    }

    detailWrap.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-bold mb-3">${data.title}</h2>
        ${tagDom ? `<div class="mb-3">${tagDom}</div>` : ""}
        <div class="flex items-center gap-3 mb-5">
            <div class="w-9 h-9 rounded-full ${data.avatar} flex items-center justify-center text-sm">${data.avatarChar ?? data.author.charAt(0)}</div>
            <div>
                <div>${data.author} ${data.institute ? "· " + data.institute : ""}</div>
                <div class="text-xs text-gray-400">发布于 ${data.time}</div>
            </div>
        </div>
        <div class="text-sm leading-relaxed whitespace-pre-wrap mb-6">${data.fullContent}</div>
        <div class="pt-4 border-t border-gray-100 text-xs text-gray-400 flex items-center">
            <span>点赞 ${data.stats.like}</span>
            <span class="mx-4">|</span>
            <span>回复 ${data.stats.reply}</span>
            <span class="mx-4">|</span>
            <span>浏览 ${data.viewNum ?? 0}</span>
            ${debateJump}
        </div>
    </div>

    <!-- 新增：发表评论输入框 -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 class="font-medium text-gray-800 mb-3">发表评论</h3>
        <textarea 
            class="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-secondary"
            rows="4"
            placeholder="写下你的观点、补充、质疑..."
        ></textarea>
        <div class="flex justify-end mt-3">
            <button class="bg-primary text-white px-5 py-2 rounded text-sm hover:bg-primary/90">
                提交评论
            </button>
        </div>
    </div>

    <!-- 历史评论列表 -->
    <div class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="font-medium mb-4 border-b pb-2">全部评论(${data.stats.reply})</h3>
        ${commentDom || "<p class='text-gray-400 text-sm'>暂无评论</p>"}
    </div>
`;

    const pageBox = document.querySelector(".page-content");
    if (pageBox) pageBox.scrollTop = 0;
}

// ========== 返回论坛广场 ==========
function closeForumDetail() {
    const listPanel = document.getElementById("forum-list-view");
    const detailPanel = document.getElementById("forum-detail-view");
    if (!listPanel || !detailPanel) return;

    detailPanel.classList.add("hidden");
    listPanel.classList.remove("hidden");
}


//========== 进入辩论二级详情 ==========
function jumpDebateFromPost(debateId) {
    // 1. 模拟点击顶部导航【学术八角笼】，先渲染辩论板块DOM
    document.querySelector('i[nav-target="debate"]').click();
    // 延迟等待DOM渲染完成，再打开辩论详情
    setTimeout(function(){
        openDebateDetail(debateId);
    }, 25);
}

// ========== 进入论坛帖子详情 ==========
function jumpPostFromDebate(postId) {
    // 1. 模拟点击顶部导航【自由论坛】，先渲染论坛板块DOM
    document.querySelector('i[nav-target="forum"]').click();
    // 延迟等待DOM渲染完成，再打开帖子详情
    setTimeout(function(){
        openForumDetail(postId);
    }, 25);
}

// ========== 数据渲染：我的投稿 ==========
function renderMySubmissions() {
    const container = document.getElementById('my-submission-list');
    if (!container) return;
    let html = '';
    MOCK_DATA.mySubmissions.forEach(item => {
        const statusColor = item.status === 'pass' ? 'text-green-600' : 'text-amber-600';
        const statusIcon = item.status === 'pass' ? 'fa-check-circle' : 'fa-clock-o';
        html += `
            <div class="bg-white border border-gray-200 rounded-lg p-5 card-hover">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">${item.category}</span>
                            <span class="text-xs text-gray-400">${item.date}</span>
                            <span class="text-xs ${statusColor}"><i class="fa ${statusIcon} mr-1"></i>${item.statusText}</span>
                        </div>
                        <h3 class="text-base font-semibold mb-2 hover:text-secondary cursor-pointer">${item.title}</h3>
                        <p class="text-sm text-gray-600 line-clamp-2 mb-3">${item.abstract}</p>
                        <div class="flex items-center space-x-4 text-xs text-gray-500">
                            <span><i class="fa fa-thumbs-o-up mr-1"></i> ${item.stats.agree} 附议</span>
                            <span><i class="fa fa-comment-o mr-1"></i> ${item.stats.comment} 评论</span>
                            <span><i class="fa fa-eye mr-1"></i> ${item.stats.view} 阅读</span>
                        </div>
                    </div>
                    <button class="border border-gray-300 text-gray-600 px-3 py-1 rounded text-sm hover:border-secondary hover:text-secondary">
                        ${item.action}
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ========== 渲染通知列表 ==========
function renderNotifications() {
    const list = document.getElementById('notification-list');
    const data = window.MOCK_DATA.notifications;
    const unreadCount = data.filter(n => !n.read).length;
    const dot = document.getElementById('notification-dot');

    // 控制小红点显示
    dot.style.display = unreadCount > 0 ? 'block' : 'none';

    let html = '';
    data.forEach(item => {
        const unreadClass = item.read ? '' : 'bg-blue-50/50';
        const iconMap = {
            research: 'fa-flask text-blue-500',
            system: 'fa-cog text-gray-500',
            interaction: 'fa-comment-o text-green-500'
        };
        const icon = iconMap[item.type] || 'fa-bell-o text-gray-500';

        html += `
            <div class="px-4 py-3 border-b border-gray-50 last:border-0 ${unreadClass} hover:bg-gray-50 cursor-pointer">
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <i class="fa ${icon} text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-800">${item.title}</div>
                        <div class="text-xs text-gray-600 mt-0.5 line-clamp-2">${item.content}</div>
                        <div class="text-xs text-gray-400 mt-1">${item.time}</div>
                    </div>
                    ${item.read ? '' : '<span class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>'}
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}

// ========== 全部标记已读 ==========
function markAllRead() {
    window.MOCK_DATA.notifications.forEach(n => n.read = true);
    renderNotifications();
}

// ========== 渲染学者归档页面 ==========
function renderArchive() {
    renderArchiveList();
}

// ========== 渲染归档列表（一级页面） ==========
function renderArchiveList() {
    const listEl = document.getElementById('archive-card-list');
    const listView = document.getElementById('archive-list-view');
    const detailView = document.getElementById('archive-detail-view');
    
    // 默认显示列表，隐藏详情
    listView.classList.remove('hidden');
    detailView.classList.add('hidden');

    if (!listEl) return;
    const data = window.MOCK_DATA.archiveList;

    let html = '';
    data.forEach(scholar => {
        html += `
            <div onclick="openArchiveDetail('${scholar.id}')" class="bg-white border border-gray-200 rounded-lg p-5 cursor-pointer card-hover">
                <div class="flex items-start space-x-4">
                    <div class="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center text-xl font-serif text-gray-500">
                        ${scholar.name.charAt(0)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2 mb-1">
                            <h3 class="text-base font-semibold text-gray-800">${scholar.name}</h3>
                            <span class="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">${scholar.tag}</span>
                        </div>
                        <div class="text-xs text-gray-500 mb-2">${scholar.field}</div>
                        <p class="text-sm text-gray-600 line-clamp-2 mb-3">${scholar.summary}</p>
                        <div class="flex items-center space-x-4 text-xs text-gray-500">
                            <span><i class="fa fa-book mr-1"></i> ${scholar.stats.works} 部著作</span>
                            <span><i class="fa fa-comment-o mr-1"></i> ${scholar.stats.comments} 条讨论</span>
                            <span><i class="fa fa-eye mr-1"></i> ${scholar.stats.views.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

// ========== 打开学者详情（二级页面） ==========
function openArchiveDetail(id) {
    const detail = window.MOCK_DATA.archiveDetail[id];
    if (!detail) return;

    const listView = document.getElementById('archive-list-view');
    const detailView = document.getElementById('archive-detail-view');
    listView.classList.add('hidden');
    detailView.classList.remove('hidden');

    // 基本信息
    document.getElementById('detail-avatar').textContent = detail.name.charAt(0);
    document.getElementById('detail-name').textContent = detail.name;
    document.getElementById('detail-summary').textContent = detail.summary;
    document.getElementById('detail-lifespan').textContent = `${detail.birth} ~ ${detail.death}`;
    document.getElementById('detail-field').textContent = detail.field;
    document.getElementById('detail-institution').textContent = detail.institution;

    // 核心贡献
    const contribEl = document.getElementById('detail-contributions');
    contribEl.innerHTML = detail.contributions.map(item => `
        <li class="flex items-start">
            <i class="fa fa-check-circle text-green-500 mt-0.5 mr-2"></i>
            <span>${item}</span>
        </li>
    `).join('');

    // 归档数据
    const statsEl = document.getElementById('detail-stats');
    statsEl.innerHTML = `
        <div class="flex justify-between text-sm">
            <span class="text-gray-500">代表著作</span>
            <span class="font-medium">${detail.works.length} 部核心著作</span>
        </div>
        <div class="flex justify-between text-sm">
            <span class="text-gray-500">存世文献</span>
            <span class="font-medium">12 篇存世文献</span>
        </div>
        <div class="flex justify-between text-sm">
            <span class="text-gray-500">思想分期</span>
            <span class="font-medium">早期 / 晚期 两阶段</span>
        </div>
    `;

    // 学术年表
    const timelineEl = document.getElementById('detail-timeline');
    timelineEl.innerHTML = detail.timeline.map(item => `
        <div class="relative">
            <span class="absolute -left-[21px] top-0.5 w-3 h-3 bg-white border-2 border-primary rounded-full"></span>
            <div class="text-sm font-semibold text-primary mb-1">${item.year}</div>
            <div class="text-base font-medium text-gray-800 mb-1">${item.title}</div>
            <div class="text-sm text-gray-600">${item.content}</div>
        </div>
    `).join('');

    // 代表著作
    const worksEl = document.getElementById('detail-works');
    worksEl.innerHTML = detail.works.map(item => `
        <div class="border border-gray-200 rounded-lg p-4 hover:border-secondary transition-colors">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-medium text-gray-800">${item.title}</h3>
                <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">${item.type}</span>
            </div>
            <div class="text-xs text-gray-500 mb-2">出版年份：${item.year}</div>
            <p class="text-sm text-gray-600 line-clamp-3">${item.abstract}</p>
        </div>
    `).join('');

    // ========== 渲染后继相关学术成果 ==========
    const successorContainer = document.getElementById('archive-successor-list');
    if (successorContainer && detail.successorWorks) {
        const sw = detail.successorWorks;
        let html = '';

        // 第一层：直接师承延续
        html += `
            <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <span class="w-1 h-4 bg-primary rounded mr-2"></span>
                    直接师承与理论延续
                </h3>
                <div class="space-y-3">
        `;
        sw.directSuccession.forEach(item => {
            html += `
                <div class="flex items-start space-x-3 card-hover border border-gray-100 rounded p-3 cursor-pointer" onclick="openArchive(${item.archiveId})">
                    <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex-shrink-0 flex items-center justify-center text-sm font-medium">
                        ${item.name.charAt(0)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-800 mb-1">
                            ${item.name} · ${item.achievement}
                        </div>
                        <p class="text-xs text-gray-500 mb-1">${item.desc}</p>
                        <div class="text-xs text-gray-400 flex items-center space-x-3">
                            <span>${item.journal}</span>
                            <span class="text-primary">查看学者档案 →</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;

        // 第二层：核心理论拓展
        html += `
            <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <span class="w-1 h-4 bg-secondary rounded mr-2"></span>
                    核心理论拓展与争议
                </h3>
                <div class="space-y-3">
        `;
        sw.coreResearch.forEach(item => {
            html += `
                <div class="card-hover border border-gray-100 rounded p-3 cursor-pointer" onclick="openJournalDetail(${item.journalId})">
                    <div class="text-sm font-medium text-gray-800 mb-1">${item.title}</div>
                    <p class="text-xs text-gray-500 mb-1">${item.author} · ${item.desc}</p>
                    <div class="text-xs text-gray-400 flex items-center justify-between">
                        <span>刊载于：${item.journal}</span>
                        <span class="text-primary">查看论文详情 →</span>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;

        // 第三层：跨领域应用
        html += `
            <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <span class="w-1 h-4 bg-gray-400 rounded mr-2"></span>
                    跨领域思想应用
                </h3>
                <div class="space-y-3">
        `;
        sw.crossField.forEach(item => {
            html += `
                <div class="card-hover border border-gray-100 rounded p-3">
                    <div class="text-sm font-medium text-gray-800 mb-1">${item.title}</div>
                    <p class="text-xs text-gray-500 mb-1">${item.desc}</p>
                    <div class="text-xs text-gray-400">
                        应用领域：${item.fields}
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;

        successorContainer.innerHTML = html;
    }

    // 滚动到顶部
    document.querySelector('.page-content').scrollTop = 0;
}

// ========== 返回归档列表 ==========
function closeArchiveDetail() {
    const listView = document.getElementById('archive-list-view');
    const detailView = document.getElementById('archive-detail-view');
    detailView.classList.add('hidden');
    listView.classList.remove('hidden');
}

// ========== 打开资讯详情 ==========
function openNewsDetail(id) {
    const detail = window.MOCK_DATA.newsDetail[id];
    if (!detail) return;

    document.getElementById('news-list-view').classList.add('hidden');
    document.getElementById('news-detail-view').classList.remove('hidden');

    document.getElementById('detail-news-category').textContent = detail.category;
    document.getElementById('detail-news-title').textContent = detail.title;
    document.getElementById('detail-news-source').textContent = detail.source;
    document.getElementById('detail-news-date').textContent = detail.date;
    document.getElementById('detail-news-content').innerHTML = detail.content;

    document.querySelector('.page-content').scrollTop = 0;
}

// ========== 返回资讯列表 ==========
function closeNewsDetail() {
    document.getElementById('news-detail-view').classList.add('hidden');
    document.getElementById('news-list-view').classList.remove('hidden');
}

// ========== 期刊分区：渲染列表 ==========
function renderJournalList() {
    const listView = document.getElementById('journal-list-view');
    const detailView = document.getElementById('journal-detail-view');
    const container = document.getElementById('journal-card-container');
    
    listView.classList.remove('hidden');
    detailView.classList.add('hidden');
    if (!container) return;

    const data = MOCK_DATA.journalList;
    let html = '';

    data.forEach(item => {
        // 等级标签颜色
        let levelClass = 'bg-blue-50 text-blue-600';
        if (item.levelType === 'sci1' || item.levelType === 'ssci1') levelClass = 'bg-purple-50 text-purple-600';
        if (item.levelType === 'sci2') levelClass = 'bg-indigo-50 text-indigo-600';
        
        // 状态标签颜色
        let statusClass = 'text-green-600';
        let statusIcon = 'fa-check-circle';
        if (item.statusType === 'warning') {
            statusClass = 'text-red-600';
            statusIcon = 'fa-exclamation-triangle';
        }

        html += `
            <div onclick="openJournalDetail(${item.id})" class="bg-white border border-gray-200 rounded-lg p-5 card-hover cursor-pointer">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="text-base font-semibold text-gray-800">${item.name}</h3>
                    <span class="text-xs px-2 py-0.5 ${levelClass} rounded">${item.level}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3">主办单位：${item.publisher} · ${item.cycle}</p>
                
                <div class="grid grid-cols-3 gap-2 mb-4 text-center text-xs">
                    <div class="bg-gray-50 rounded py-2">
                        <div class="font-medium text-gray-800">${item.impactFactor}</div>
                        <div class="text-gray-500">影响因子</div>
                    </div>
                    <div class="bg-gray-50 rounded py-2">
                        <div class="font-medium text-gray-800">${item.partition}</div>
                        <div class="text-gray-500">分区</div>
                    </div>
                    <div class="bg-gray-50 rounded py-2">
                        <div class="font-medium text-gray-800">${item.reviewCycle}</div>
                        <div class="text-gray-500">审稿周期</div>
                    </div>
                </div>

                <div class="flex items-center text-xs text-gray-500 mb-4">
                    <span class="mr-3"><i class="fa fa-database mr-1"></i> ${item.databases}</span>
                    <span class="${statusClass}"><i class="fa ${statusIcon} mr-1"></i> ${item.status}</span>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div class="text-xs text-gray-500">
                        <span class="mr-3"><i class="fa fa-file-text-o mr-1"></i> 本站关联 ${item.relatedPapers} 篇</span>
                        <span><i class="fa fa-gavel mr-1"></i> 关联辩论 ${item.relatedDebates} 场</span>
                    </div>
                    <span class="text-sm text-primary hover:text-secondary">查看详情</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ========== 期刊分区：打开详情页 ==========
function openJournalDetail(id) {
    const detail = MOCK_DATA.journalDetail[id];
    if (!detail) return;

    document.getElementById('journal-list-view').classList.add('hidden');
    document.getElementById('journal-detail-view').classList.remove('hidden');

    // 头部基础信息
    document.getElementById('detail-journal-name').textContent = detail.name;
    document.getElementById('detail-journal-ename').textContent = detail.enName + ' · ' + detail.subtitle;
    document.getElementById('detail-journal-level').textContent = detail.level;
    document.getElementById('detail-journal-status').textContent = detail.status;
    document.getElementById('detail-difficulty').textContent = detail.difficulty;
    document.getElementById('detail-review-time').textContent = detail.reviewTime;
    document.getElementById('detail-accept-rate').textContent = detail.acceptRate;
    document.getElementById('detail-site-accept').textContent = detail.siteAccept;

    // 收录论文列表
    const paperContainer = document.getElementById('detail-paper-list');
    paperContainer.innerHTML = detail.papers.map(item => `
        <div class="card-hover border border-gray-100 rounded p-3 cursor-pointer">
            <div class="text-sm font-medium text-gray-800 mb-1">${item.title}</div>
            <div class="text-xs text-gray-500 mb-2">作者：${item.author} · ${item.issue} · DOI: ${item.doi}</div>
            <div class="flex items-center justify-between text-xs">
                <span class="text-gray-400">被本站 ${item.citeDebate} 场辩论引用</span>
                <span class="text-primary">查看详情 →</span>
            </div>
        </div>
    `).join('');

    // 相关辩论列表
    const debateContainer = document.getElementById('detail-debate-list');
    debateContainer.innerHTML = detail.debates.map(item => {
        let statusClass = 'bg-gray-100 text-gray-600';
        if (item.status === '已归档') statusClass = 'bg-red-50 text-red-600';
        if (item.status === '进行中') statusClass = 'bg-blue-50 text-blue-600';
        
        return `
            <div class="flex items-start space-x-3 card-hover border border-gray-100 rounded p-3 cursor-pointer">
                <span class="text-xs px-1.5 py-0.5 ${statusClass} rounded flex-shrink-0 mt-0.5">${item.status}</span>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-800 mb-1">${item.title}</div>
                    <div class="text-xs text-gray-500">${item.desc}</div>
                </div>
            </div>
        `;
    }).join('');

    document.querySelector('.page-content').scrollTop = 0;
}

// ========== 期刊分区：返回列表 ==========
function closeJournalDetail() {
    document.getElementById('journal-detail-view').classList.add('hidden');
    document.getElementById('journal-list-view').classList.remove('hidden');
}


// 打开个人主页，动态渲染全部内容
function openUserProfile() {
    const viewWrap = document.getElementById('user-profile-view');
    const leftWrap = document.getElementById('profile-left-wrap');
    const user = window.MOCK_DATA.userInfo;

    if (!viewWrap || !leftWrap || !user) return;

    // 左侧卡片完整动态拼接
    const leftHtml = `
    <div class="bg-white border border-gray-200 rounded-lg p-6 sticky top-4">
        <div class="text-center mb-4">
            <div class="w-20 h-20 rounded-full bg-primary text-white mx-auto flex items-center justify-center text-2xl font-medium mb-3">
                ${user.avatarChar}
            </div>
            <h2 class="text-lg font-bold text-gray-800">${user.name}</h2>
            <div class="flex items-center justify-center space-x-1 mt-1">
                <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">${user.userTag}</span>
            </div>
        </div>
        <div class="space-y-3 text-sm border-t border-gray-100 pt-4">
            <div class="flex items-start">
                <i class="fa fa-graduation-cap text-gray-400 mt-0.5 mr-3 w-4"></i>
                <div>
                    <div class="text-gray-500 text-xs">研究领域</div>
                    <div class="text-gray-700">${user.field}</div>
                </div>
            </div>
            <div class="flex items-start">
                <i class="fa fa-building text-gray-400 mt-0.5 mr-3 w-4"></i>
                <div>
                    <div class="text-gray-500 text-xs">所属机构</div>
                    <div class="text-gray-700">${user.institute}</div>
                </div>
            </div>
            <div class="flex items-start">
                <i class="fa fa-calendar text-gray-400 mt-0.5 mr-3 w-4"></i>
                <div>
                    <div class="text-gray-500 text-xs">加入时间</div>
                    <div class="text-gray-700">${user.joinTime}</div>
                </div>
            </div>
            <div class="flex items-start">
                <i class="fa fa-user-circle text-gray-400 mt-0.5 mr-3 w-4"></i>
                    <div>
                        <div class="text-gray-500 text-xs">账号状态</div>
                        <div class="${getAccountStatusClass(user.accountStatus)} text-xs flex items-center">
                            ${getAccountStatusText(user.accountStatus)}
                    </div>
                    <button onclick="cycleAccountStatus()" class="mt-1 text-xs px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200">轮换状态</button>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-2 border-t border-gray-100 mt-4 pt-4 text-center">
            <div>
                <div class="font-bold text-gray-800">${user.stat.submit}</div>
                <div class="text-xs text-gray-500">投稿</div>
            </div>
            <div>
                <div class="font-bold text-gray-800">${user.stat.post}</div>
                <div class="text-xs text-gray-500">发帖</div>
            </div>
            <div>
                <div class="font-bold text-gray-800">${user.stat.debate}</div>
                <div class="text-xs text-gray-500">辩论</div>
            </div>
        </div>
        <button class="w-full mt-4 border border-gray-300 text-gray-600 py-2 rounded text-sm hover:bg-gray-50">
            编辑个人资料
        </button>
    </div>`;

    leftWrap.innerHTML = leftHtml;

    // 填充各个Tab面板
    document.getElementById('tab-submit').innerHTML = renderSubmitCards(user.submitList);
    document.getElementById('tab-post').innerHTML = renderPostCards(user.postList);
    document.getElementById('tab-debate').innerHTML = renderDebateCards(user.joinDebateList);
    document.getElementById('tab-check').innerHTML = user.checkList.length ? '' : '<div class="text-gray-500 py-4">暂无质检记录</div>';
    document.getElementById('tab-collect').innerHTML = renderCollectCards(user.collectList);

    bindProfileTabEvent();
}

//发表论文渲染
function renderSubmitCards(arr) {
    if (!arr || arr.length === 0) return `<div class="text-gray-500 py-4">暂无投稿内容</div>`;
    let html = "";
    arr.forEach(item => {
        const statusText = item.auditStatus === "pass"
            ? `<span class="text-green-600 text-xs">AI质检通过</span>`
            : `<span class="text-orange-500 text-xs">审核中</span>`;
        html += `
        <div class="bg-white border border-gray-200 rounded-lg p-5">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs bg-gray-100 px-2 py-0.5 rounded">${item.subject}</span>
              ${statusText}
              <span class="text-xs text-gray-400">${item.date}</span>
            </div>
            <!-- 论文标题可点击跳转，主流简约样式 -->
            <h4 class="font-medium text-gray-800 cursor-pointer rounded px-1 -ml-1  hover:text-gray-900 transition-colors" onclick="jumpToPaper(${item.paperId})">${item.title}</h4>
            <p class="text-sm text-gray-600 mt-2 line-clamp-2">${item.desc}</p>
            <div class="text-xs text-gray-400 mt-3 flex gap-4">
              <span>附议 ${item.agree}</span>
              <span>评论 ${item.comment}</span>
              <span>阅读 ${item.view}</span>
            </div>
          </div>
        </div>`;
    });
    return html;
}

// 发帖列表渲染
function renderPostCards(arr) {
    if (!arr || arr.length === 0) return `<div class="text-gray-500 py-4">暂无发帖</div>`;
    let html = "";
    arr.forEach(item => {
        html += `
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h4 class="font-medium">${item.title}</h4>
          <div class="text-xs text-gray-400 mt-2">点赞 ${item.like} · 回复 ${item.reply}</div>
          <button onclick="jumpPostFromDebate(${item.linkDebateId});" class="text-primary text-sm mt-2 hover:underline">查看关联辩论</button>
        </div>`;
    });
    return html;
}

// 参与辩论渲染
function renderDebateCards(arr) {
    if (!arr || arr.length === 0) return `<div class="text-gray-500 py-4">未参与任何辩论</div>`;
    let html = "";
    arr.forEach(item => {
        const sideClass = item.side === "正方" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600";
        html += `
        <div class="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center">
          <div>
            <span class="text-xs px-1.5 py-0.5 rounded ${sideClass}">${item.side}</span>
            <h4 class="font-medium mt-1">${item.title}</h4>
            <div class="text-xs text-gray-400">参与第${item.roundNum}轮交锋</div>
          </div>
          <button onclick="jumpDebateFromPost(${item.debateId})" class="text-primary text-sm hover:underline">前往辩论</button>
        </div>`;
    });
    return html;
}

// 收藏列表渲染
function renderCollectCards(arr) {
    if (!arr || arr.length === 0) return `<div class="text-gray-500 py-4">暂无收藏</div>`;
    let html = "";
    arr.forEach(item => {
        html += `
        <div class="bg-white border border-gray-200 rounded-lg p-3 flex items-center">
            <span class="flex-1 cursor-pointer rounded px-1 -ml-1 text-gray-800 hover:text-gray-900 transition-colors" onclick="jumpToPaper(${item.paperId})">${item.title}</span>
        </div>`;
    });
    return html;
}

// Tab切换逻辑
function bindProfileTabEvent() {
    const tabs = document.querySelectorAll(".profile-tab");
    tabs.forEach(tab => {
        tab.onclick = function () {
            tabs.forEach(t => {
                t.classList.remove("tab-active", "text-primary", "border-b-2", "border-primary");
                t.classList.add("text-gray-500");
            });
            this.classList.add("tab-active", "text-primary", "border-b-2", "border-primary");
            this.classList.remove("text-gray-500");
            document.querySelectorAll(".tab-content").forEach(p => p.classList.add("hidden"));
            const target = this.dataset.tab;
            document.getElementById(`tab-${target}`).classList.remove("hidden");
        };
    });
    const activeTab = document.querySelector(".profile-tab.tab-active");
    if (activeTab) {
        activeTab.classList.add("text-primary", "border-b-2", "border-primary");
        activeTab.classList.remove("text-gray-500");
    }
}

// 状态文字映射
function getAccountStatusText(status) {
    const map = {
        online: '<i class="fa fa-circle mr-1 text-green-500"></i>在线',
        offline: '<i class="fa fa-circle mr-1 text-gray-400"></i>离线',
        passedAway: '<i class="fa fa-circle mr-1 text-gray-600"></i>已故',
        banned: '<i class="fa fa-circle mr-1 text-red-500"></i>涉嫌学术不端，账号已封禁'
    }
    return map[status] ?? map.offline;
}

// 文字颜色映射
function getAccountStatusClass(status) {
    const map = {
        online: "text-green-600",
        offline: "text-gray-500",
        passedAway: "text-gray-700",
        banned: "text-red-600"
    }
    return map[status] ?? map.offline;
}

// 循环切换四种状态
function cycleAccountStatus() {
    const statusArr = ["online", "offline", "passedAway", "banned"];
    const user = window.MOCK_DATA.userInfo;
    const idx = statusArr.indexOf(user.accountStatus);
    user.accountStatus = statusArr[(idx + 1) % statusArr.length];
    openUserProfile();
}


// 论文详情入口：从Mock数据中读取论文信息并渲染
function openPaperDetail(paperId) {
    // 查找论文数据
    const paper = MOCK_DATA.submissions.find(p => p.id === paperId);
    if (!paper) {
        console.error('未找到论文：', paperId);
        return;
    }

    // 作者头像首字
    const avatarEl = document.getElementById('paper-author-avatar');
    if (avatarEl) avatarEl.textContent = paper.author.charAt(0);

    // 作者姓名
    const nameEl = document.getElementById('paper-author-name');
    if (nameEl) nameEl.textContent = paper.author;

    // 作者类型
    const typeEl = document.getElementById('paper-author-type');
    if (typeEl) typeEl.textContent = paper.authorType || '';

    // 作者研究领域（Mock数据中暂缺，可用分类代替）
    const fieldEl = document.getElementById('paper-author-field');
    if (fieldEl) fieldEl.textContent = paper.category || '';

    // 查看作者主页按钮
    const linkEl = document.getElementById('paper-author-link');
    if (linkEl) linkEl.onclick = function() { jumpBackScholar(paper.authorId || 1); };

    // 论文标题
    const titleEl = document.getElementById('paper-title');
    if (titleEl) titleEl.textContent = paper.title;

    // 摘要
    const abstractEl = document.getElementById('paper-abstract');
    if (abstractEl) abstractEl.textContent = paper.abstract;

    // 状态标签
    const tagsEl = document.getElementById('paper-status-tags');
    if (tagsEl) {
        let statusClass = 'bg-green-50 text-green-600 border-green-200';
        if (paper.status === 'flagged') statusClass = 'bg-orange-50 text-orange-600 border-orange-200';
        tagsEl.innerHTML = `
            <span class="text-xs px-2 py-0.5 rounded border ${statusClass}">${paper.statusText || 'AI质检通过'}</span>
            <span class="text-xs px-2 py-0.5 bg-blue-50 text-primary rounded border border-blue-200">${paper.category}</span>
        `;
    }

    // 分类
    const catEl = document.getElementById('paper-category');
    if (catEl) catEl.textContent = paper.category;

    // 日期
    const dateEl = document.getElementById('paper-date');
    if (dateEl) dateEl.textContent = paper.date;

    // 互动数据
    const statsEl = document.getElementById('paper-stats');
    if (statsEl && paper.stats) {
        statsEl.textContent = `${paper.stats.agree || 0} 附议 · ${paper.stats.comment || 0} 评论 · ${paper.stats.view || 0} 阅读`;
    }

    // 加载PDF
    loadStaticPdf();
}

// 跳转论文页面
function jumpToPaper(paperId) {
    switchTab("paper");
    setTimeout(() => openPaperDetail(paperId), 25);
}

// AI质检报告面板：展开/收起
function toggleQCpanel() {
    var panel = document.getElementById('qc-panel');
    if (!panel) return;
    var isOpen = panel.classList.contains('translate-x-full');
    if (isOpen) {
        panel.classList.remove('translate-x-full');
        panel.classList.add('translate-x-0');
    } else {
        panel.classList.remove('translate-x-0');
        panel.classList.add('translate-x-full');
    }
}