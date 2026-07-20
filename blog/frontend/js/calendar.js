function renderCalendar(year, month, articleDates) {
    const container = document.getElementById('calendar');
    if (!container) return;

    const monthNames = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const dateSet = new Set(articleDates || []);

    let html = `<div class="calendar-header">
        <span>${year}年 ${monthNames[month - 1]}</span>
    </div>`;

    html += '<div class="calendar-grid">';
    dayLabels.forEach(d => {
        html += `<div class="day-label">${d}</div>`;
    });

    // 填充空白
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="day empty"></div>';
    }

    // 日期
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasArticle = dateSet.has(dateStr) ? ' has-article' : '';
        html += `<div class="day${hasArticle}">${d}</div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}
