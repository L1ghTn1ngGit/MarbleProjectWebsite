// Global state
let allData = [];
let filteredData = [];
let currentPage = 1;
const recordsPerPage = 50;
let charts = {};

// Format currency
function formatCurrency(num) {
    if (!num) return '$0';
    const absNum = Math.abs(num);
    if (absNum >= 1e9) return (num >= 0 ? '$' : '-$') + (absNum / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return (num >= 0 ? '$' : '-$') + (absNum / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return (num >= 0 ? '$' : '-$') + (absNum / 1e3).toFixed(2) + 'K';
    return (num >= 0 ? '$' : '-$') + absNum.toFixed(0);
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Simple inline icons (SVG) to replace emojis for accessibility and consistency
function getIcon(type) {
    const commonProps = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon" aria-hidden="true"';
    if (type === 'alert') return `<svg ${commonProps}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    if (type === 'trend') return `<svg ${commonProps}><polyline points="4 14 9 9 13 13 20 6"></polyline><polyline points="20 10 20 6 16 6"></polyline></svg>`;
    if (type === 'info') return `<svg ${commonProps}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    return '';
}

function getStatusInfo(diff, modified) {
    if (diff > modified * 0.5 && modified > 0) return { type: 'critical', label: 'Critical Overrun' };
    if (diff > 0) return { type: 'over', label: 'Over Budget' };
    if (diff < 0) return { type: 'under', label: 'Under Budget' };
    return { type: 'normal', label: 'On Track' };
}

// Animate number counting
function animateNumber(element, target, duration = 1000, prefix = '', suffix = '') {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        if (prefix === '$') {
            element.textContent = formatCurrency(current);
        } else {
            element.textContent = prefix + formatNumber(Math.floor(current)) + suffix;
        }
    }, 16);
}

// Load data
async function loadData() {
    try {
        console.log('Loading education data...');
        
        const response = await fetch('nyc-education-data.csv');
        if (!response.ok) throw new Error('Failed to load data');
        
        const csvText = await response.text();
        
        const parsed = await new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: resolve,
                error: reject
            });
        });
        
        // Process data
        for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i];
            if (row.Agency && row.Year) {
                allData.push(row);
            }
        }
        
        filteredData = [...allData];
        
        console.log(`Loaded ${allData.length} records`);
        
        // Initialize everything
        updateHeroStats();
        updateMetrics();
        createCharts();
        displayTable();
        generateInsights();
        generateWorstOffenders();
        setupEventListeners();
        
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('totalSpent').textContent = 'Error loading data';
    }
}

// Update hero stats with animations
function updateHeroStats() {
    let totalSpent = 0;
    const programs = new Set();
    let alerts = 0;
    
    for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        const cash = parseFloat(row['Cash Expense']) || 0;
        const modified = parseFloat(row['Modified']) || 0;
        
        totalSpent += cash;
        if (row.Department) programs.add(row.Department);
        if (modified > 0 && cash > modified * 1.1) alerts++;
    }
    
    animateNumber(document.getElementById('heroTotal'), totalSpent, 1500, '$');
    animateNumber(document.getElementById('heroPrograms'), programs.size, 1200);
    animateNumber(document.getElementById('heroAlerts'), alerts, 1000);
}

// Update metrics section
function updateMetrics() {
    let totalSpent = 0;
    let totalModified = 0;
    let overBudgetCount = 0;
    
    for (let i = 0; i < filteredData.length; i++) {
        const row = filteredData[i];
        const cash = parseFloat(row['Cash Expense']) || 0;
        const modified = parseFloat(row['Modified']) || 0;
        
        totalSpent += cash;
        totalModified += modified;
        if (modified > 0 && cash > modified * 1.1) overBudgetCount++;
    }
    
    const efficiency = totalModified > 0 ? (totalSpent / totalModified * 100).toFixed(1) : 0;
    
    animateNumber(document.getElementById('totalSpent'), totalSpent, 1200, '$');
    animateNumber(document.getElementById('totalBudget'), totalModified, 1200, '$');
    animateNumber(document.getElementById('overBudget'), overBudgetCount, 1000);
    
    // Status indicators (reserved for future UI badges)
    const effStatus = efficiency < 95 ? 'Under budget' : efficiency > 105 ? 'Over budget' : 'On track';
}

// Create charts
function createCharts() {
    createDepartmentChart();
}

// Department spending chart
function createDepartmentChart() {
    const isDark = document.body.classList.contains('dark-mode');
    const palette = isDark ? {
        bar: 'rgba(255, 255, 255, 0.9)',
        border: 'rgba(255, 255, 255, 0.9)',
        grid: 'rgba(255, 255, 255, 0.08)',
        ticks: '#f5f5f5'
    } : {
        bar: 'rgba(0, 0, 0, 0.8)',
        border: 'rgba(0, 0, 0, 1)',
        grid: 'rgba(0, 0, 0, 0.08)',
        ticks: '#212121'
    };

    const deptTotals = {};
    
    for (let i = 0; i < filteredData.length; i++) {
        const row = filteredData[i];
        const dept = row.Department || 'Unknown';
        const cash = parseFloat(row['Cash Expense']) || 0;
        deptTotals[dept] = (deptTotals[dept] || 0) + cash;
    }
    
    const sorted = Object.entries(deptTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const ctx = document.getElementById('departmentChart');
    if (charts.department) charts.department.destroy();
    
    charts.department = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: 'Total Spending',
                data: sorted.map(x => x[1]),
                backgroundColor: palette.bar,
                borderColor: palette.border,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => formatCurrency(ctx.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value),
                        color: palette.ticks
                    },
                    grid: {
                        color: palette.grid
                    }
                },
                x: {
                    ticks: {
                        color: palette.ticks
                    },
                    grid: {
                        color: palette.grid
                    }
                }
            }
        }
    });
}

// Year-over-year trend chart
function createTrendChart() {
    
}

// Display table with pagination
function displayTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageData = filteredData.slice(start, end);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No records found</td></tr>';
        return;
    }
    
    for (let i = 0; i < pageData.length; i++) {
        const row = pageData[i];
        const tr = document.createElement('tr');
        
        const modified = parseFloat(row['Modified']) || 0;
        const cash = parseFloat(row['Cash Expense']) || 0;
        const diff = cash - modified;
        
        const statusMeta = getStatusInfo(diff, modified);
        
        tr.innerHTML = `
            <td>${row.Year}</td>
            <td>${row.Department || 'N/A'}</td>
            <td>${row['Budget Name'] || 'N/A'}</td>
            <td>${formatCurrency(modified)}</td>
            <td>${formatCurrency(cash)}</td>
            <td style="color: ${diff > 0 ? '#EF4444' : '#10B981'}">${formatCurrency(diff)}</td>
            <td class="status-cell">
                <span class="status-dot status-${statusMeta.type}" aria-hidden="true"></span>
                <span class="status-label">${statusMeta.label}</span>
            </td>
        `;
        
        tbody.appendChild(tr);
    }
    
    // Update pagination
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    document.getElementById('recordCount').textContent = `Showing ${start + 1}-${Math.min(end, filteredData.length)} of ${filteredData.length}`;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Generate insights
function generateInsights() {
    const container = document.getElementById('insightsContainer');
    container.innerHTML = '';
    
    // Find biggest overspend
    let maxOverspend = null;
    let maxAmount = 0;
    
    for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        const modified = parseFloat(row['Modified']) || 0;
        const cash = parseFloat(row['Cash Expense']) || 0;
        const diff = cash - modified;
        
        if (diff > maxAmount && modified >= 100000) {
            maxAmount = diff;
            maxOverspend = row;
        }
    }
    
    if (maxOverspend) {
        const card = document.createElement('div');
        card.className = 'insight-card alert slide-up';
        card.innerHTML = `
            <h3>${getIcon('alert')} Largest Overrun</h3>
            <p><strong>${maxOverspend.Department}</strong></p>
            <p>${maxOverspend['Budget Name']}</p>
            <div class="amount">${formatCurrency(maxAmount)}</div>
            <p style="color: #6B7280;">over working budget in ${maxOverspend.Year}</p>
        `;
        container.appendChild(card);
    }
    
    // Year-over-year growth
    const yearTotals = { 2023: 0, 2024: 0, 2025: 0 };
    for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        const year = row.Year;
        const cash = parseFloat(row['Cash Expense']) || 0;
        if (yearTotals[year] !== undefined) yearTotals[year] += cash;
    }
    
    const growth2024 = ((yearTotals[2024] - yearTotals[2023]) / yearTotals[2023] * 100).toFixed(1);
    const growth2025 = ((yearTotals[2025] - yearTotals[2024]) / yearTotals[2024] * 100).toFixed(1);
    
    const growthCard = document.createElement('div');
    growthCard.className = 'insight-card slide-up delay-1';
    growthCard.innerHTML = `
        <h3>${getIcon('trend')} Spending Trends</h3>
        <p>2024 vs 2023: <strong>${growth2024 > 0 ? '+' : ''}${growth2024}%</strong></p>
        <p>2025 vs 2024: <strong>${growth2025 > 0 ? '+' : ''}${growth2025}%</strong></p>
        <div class="amount">${formatCurrency(yearTotals[2025])}</div>
        <p style="color: #6B7280;">Total 2025 spending</p>
    `;
    container.appendChild(growthCard);
    
    // Most efficient department
    const deptEfficiency = {};
    const deptCounts = {};
    
    for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        const dept = row.Department;
        const modified = parseFloat(row['Modified']) || 0;
        const cash = parseFloat(row['Cash Expense']) || 0;
        
        if (dept && modified >= 10000) {
            if (!deptEfficiency[dept]) {
                deptEfficiency[dept] = 0;
                deptCounts[dept] = 0;
            }
            deptEfficiency[dept] += (cash / modified) * 100;
            deptCounts[dept]++;
        }
    }
    
    let bestDept = null;
    let bestEff = 999;
    
    for (const dept in deptEfficiency) {
        const avg = deptEfficiency[dept] / deptCounts[dept];
        if (avg < bestEff && avg > 50) {
            bestEff = avg;
            bestDept = dept;
        }
    }
    
    if (bestDept) {
        
    }
}

// Generate and display worst offenders
function generateWorstOffenders() {
    const offenders = [];
    for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        const modified = parseFloat(row['Modified']) || 0;
        const cash = parseFloat(row['Cash Expense']) || 0;
        const diff = cash - modified;

        if (diff > 0 && modified > 0) {
            offenders.push({
                ...row,
                overrun: diff,
                overrunPercent: (diff / modified) * 100
            });
        }
    }

    // Sort by highest overrun percentage
    offenders.sort((a, b) => b.overrun - a.overrun);

    const top5 = offenders.slice(0, 5);

    const slider = document.getElementById('offendersSlider');
    slider.innerHTML = '';

    for (let i = 0; i < top5.length; i++) {
        const offender = top5[i];
        const card = document.createElement('div');
        card.className = 'offender-card';
        card.innerHTML = `
            <div class="offender-card-inner">
                <h3>${offender.Department}</h3>
                <p>${offender['Budget Name']}</p>
                <div class="amount">${formatCurrency(offender.overrun)}</div>
                <p><strong>${offender.overrunPercent.toFixed(1)}%</strong> over budget in ${offender.Year}</p>
            </div>
        `;
        slider.appendChild(card);
    }
    
    setupSlider();
}

function setupSlider() {
    const slider = document.getElementById('offendersSlider');
    const prevBtn = document.getElementById('sliderPrev');
    const nextBtn = document.getElementById('sliderNext');
    if (!slider || !prevBtn || !nextBtn || slider.children.length === 0) return;

    let currentIndex = 0;
    const totalItems = slider.children.length;

    function getItemsVisible() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 3;
    }

    function updateSlider() {
        const itemsVisible = getItemsVisible();
        const card = slider.querySelector('.offender-card');
        if (!card) return;

        const itemWidth = card.offsetWidth;
        const maxIndex = Math.max(0, totalItems - itemsVisible);

        if (currentIndex > maxIndex) currentIndex = maxIndex;
        if (currentIndex < 0) currentIndex = 0;

        slider.style.transform = `translateX(-${currentIndex * itemWidth}px)`;

        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= maxIndex;
    }

    nextBtn.addEventListener('click', () => {
        const itemsVisible = getItemsVisible();
        const maxIndex = Math.max(0, totalItems - itemsVisible);
        if (currentIndex < maxIndex) {
            currentIndex++;
            updateSlider();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateSlider();
        }
    });
    
    window.addEventListener('resize', updateSlider);
    updateSlider(); // Initial call
}

// Setup event listeners
function setupEventListeners() {
    // Year filter
    document.getElementById('yearFilter').addEventListener('change', (e) => {
        const year = e.target.value;
        if (year === 'all') {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(row => row.Year == year);
        }
        currentPage = 1;
        updateMetrics();
        createCharts();
        displayTable();
    });
    
    // Search
    document.getElementById('searchBox').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        const yearFilter = document.getElementById('yearFilter').value;
        
        filteredData = allData.filter(row => {
            const matchYear = yearFilter === 'all' || row.Year == yearFilter;
            const matchSearch = !search || 
                (row.Department && row.Department.toLowerCase().includes(search)) ||
                (row['Budget Name'] && row['Budget Name'].toLowerCase().includes(search)) ||
                (row.Agency && row.Agency.toLowerCase().includes(search));
            return matchYear && matchSearch;
        });
        
        currentPage = 1;
        updateMetrics();
        createCharts();
        displayTable();
    });
    
    // Populate filter dropdowns
    function populateFilters() {
        const programs = new Set();
        const departments = new Set();
        
        for (let i = 0; i < allData.length; i++) {
            if (allData[i]['Budget Name']) programs.add(allData[i]['Budget Name']);
            if (allData[i].Department) departments.add(allData[i].Department);
        }
        
        const programFilter = document.getElementById('programFilter');
        const departmentFilter = document.getElementById('departmentFilter');
        
        Array.from(programs).sort().forEach(prog => {
            const option = document.createElement('option');
            option.value = prog;
            option.textContent = prog;
            programFilter.appendChild(option);
        });
        
        Array.from(departments).sort().forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            departmentFilter.appendChild(option);
        });
    }
    
    // Filter dropdowns
    function applyFilters() {
        const tableYear = document.getElementById('tableYearFilter').value;
        const program = document.getElementById('programFilter').value;
        const department = document.getElementById('departmentFilter').value;
        const year = document.getElementById('yearFilter').value;
        
        filteredData = allData.filter(row => {
            const yearMatch = year === 'all' || row.Year.toString() === year;
            const tableYearMatch = tableYear === 'all' || row.Year.toString() === tableYear;
            const programMatch = program === 'all' || row['Budget Name'] === program;
            const departmentMatch = department === 'all' || row.Department === department;
            return yearMatch && tableYearMatch && programMatch && departmentMatch;
        });
        
        currentPage = 1;
        updateMetrics();
        createCharts();
        displayTable();
    }
    
    document.getElementById('tableYearFilter').addEventListener('change', applyFilters);
    document.getElementById('programFilter').addEventListener('change', applyFilters);
    document.getElementById('departmentFilter').addEventListener('change', applyFilters);
    
    // Sortable table headers
    let currentSortColumn = null;
    let currentSortOrder = 'asc';
    
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            
            // Toggle sort order if clicking same column
            if (currentSortColumn === column) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = column;
                currentSortOrder = 'asc';
            }
            
            // Remove sort classes from all headers
            document.querySelectorAll('.sortable').forEach(header => {
                header.classList.remove('sort-asc', 'sort-desc');
            });
            
            // Add sort class to clicked header
            th.classList.add(currentSortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
            
            // Sort the data
            filteredData.sort((a, b) => {
                let valA, valB;
                
                if (column === 'Modified' || column === 'Cash Expense') {
                    valA = parseFloat(a[column]) || 0;
                    valB = parseFloat(b[column]) || 0;
                } else if (column === 'Difference') {
                    valA = (parseFloat(a['Cash Expense']) || 0) - (parseFloat(a['Modified']) || 0);
                    valB = (parseFloat(b['Cash Expense']) || 0) - (parseFloat(b['Modified']) || 0);
                } else if (column === 'Status') {
                    const getStatusOrder = (row) => {
                        const mod = parseFloat(row['Modified']) || 0;
                        const cash = parseFloat(row['Cash Expense']) || 0;
                        const diff = cash - mod;
                        if (diff > mod * 0.5 && mod > 0) return 3;
                        if (diff > 0) return 2;
                        if (diff < 0) return 1;
                        return 0;
                    };
                    valA = getStatusOrder(a);
                    valB = getStatusOrder(b);
                } else {
                    valA = a[column] || '';
                    valB = b[column] || '';
                }
                
                if (typeof valA === 'string') {
                    return currentSortOrder === 'asc' ? 
                        valA.localeCompare(valA) : 
                        valB.localeCompare(valA);
                } else {
                    return currentSortOrder === 'asc' ? valA - valB : valB - valA;
                }
            });
            
            currentPage = 1;
            displayTable();
        });
    });
    
    // Populate filters on load
    populateFilters();
    
    // Table search
    document.getElementById('tableSearch').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        
        if (!search) {
            // Reset to current filtered data
            displayTable();
            return;
        }
        
        // Search within current filteredData
        const searchResults = filteredData.filter(row => {
            return (row.Department && row.Department.toLowerCase().includes(search)) ||
                   (row['Budget Name'] && row['Budget Name'].toLowerCase().includes(search)) ||
                   (row.Agency && row.Agency.toLowerCase().includes(search)) ||
                   (row.Year && row.Year.toString().includes(search));
        });
        
        // Temporarily display search results
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        
        if (searchResults.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No results found</td></tr>';
            document.getElementById('recordCount').textContent = 'Showing 0 records';
            return;
        }
        
        const displayData = searchResults.slice(0, recordsPerPage);
        
        for (let i = 0; i < displayData.length; i++) {
            const row = displayData[i];
            const tr = document.createElement('tr');
            
            const modified = parseFloat(row['Modified']) || 0;
            const cash = parseFloat(row['Cash Expense']) || 0;
            const diff = cash - modified;
            
            const statusMeta = getStatusInfo(diff, modified);
            
            tr.innerHTML = `
                <td>${row.Year}</td>
                <td>${row.Department || 'N/A'}</td>
                <td>${row['Budget Name'] || 'N/A'}</td>
                <td>${formatCurrency(modified)}</td>
                <td>${formatCurrency(cash)}</td>
                <td style="color: ${diff > 0 ? '#EF4444' : '#10B981'}">${formatCurrency(diff)}</td>
                <td class="status-cell">
                    <span class="status-dot status-${statusMeta.type}" aria-hidden="true"></span>
                    <span class="status-label">${statusMeta.label}</span>
                </td>
            `;
            
            tbody.appendChild(tr);
        }
        
        document.getElementById('recordCount').textContent = `Showing ${displayData.length} of ${searchResults.length} results`;
    });
    
    // Export
    document.getElementById('exportData').addEventListener('click', () => {
        const csv = Papa.unparse(filteredData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'education-budget-export.csv';
        a.click();
    });
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayTable();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayTable();
        }
    });
    
    // Smooth scroll for nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    // Chart view toggle
    document.getElementById('chartView').addEventListener('change', (e) => {
        const type = e.target.value;
        if (charts.department) {
            charts.department.destroy();
        }
        
        const deptTotals = {};
        for (let i = 0; i < filteredData.length; i++) {
            const row = filteredData[i];
            const dept = row.Department || 'Unknown';
            const cash = parseFloat(row['Cash Expense']) || 0;
            deptTotals[dept] = (deptTotals[dept] || 0) + cash;
        }
        
        const sorted = Object.entries(deptTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const ctx = document.getElementById('departmentChart');
        
        charts.department = new Chart(ctx, {
            type: type,
            data: {
                labels: sorted.map(x => x[0]),
                datasets: [{
                    label: 'Total Spending',
                    data: sorted.map(x => x[1]),
                    backgroundColor: type === 'pie' ? 
                        ['#000', '#333', '#666', '#999', '#BBB', '#DDD', '#222', '#444', '#777', '#AAA'] :
                        'rgba(0, 0, 0, 0.8)',
                    borderColor: 'rgba(0, 0, 0, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: { 
                        display: type === 'pie',
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => formatCurrency(ctx.parsed.y || ctx.parsed)
                        }
                    }
                },
                scales: type === 'bar' ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                } : {}
            }
        });
    });
}

// Scroll-based navigation highlighting
function updateActiveNav() {
    // Include every visible section so nav highlights match scroll position
    const sections = ['overview', 'spending', 'offenders', 'data-table', 'insights'];
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentSection = '';
    for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 150 && rect.bottom >= 150) {
                currentSection = sectionId;
                break;
            }
        }
    }
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href').substring(1);
        if (href === currentSection) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Dark mode toggle
function setupDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        
        // Update chart colors
        if (charts.department) {
            createDepartmentChart();
        }
        if (charts.trend) {
            createTrendChart();
        }
    });
}

// Budget Slideshow functionality
function setupBudgetSlideshow() {
    let currentSlide = 1;
    const slides = document.querySelectorAll('.slide');
    const indicators = document.querySelectorAll('.indicator');
    const totalSlides = slides.length;
    if (totalSlides === 0) return;
    let autoPlayInterval;
    let userInteracted = false;
    const prevBtn = document.querySelector('.slide-nav.prev');
    const nextBtn = document.querySelector('.slide-nav.next');
    
    function showSlide(slideNumber) {
        // Remove active class from all slides and indicators
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        // Add active class to current slide and indicator
        const targetSlide = document.querySelector(`.slide[data-slide="${slideNumber}"]`);
        const targetIndicator = document.querySelector(`.indicator[data-slide="${slideNumber}"]`);
        
        if (targetSlide) targetSlide.classList.add('active');
        if (targetIndicator) targetIndicator.classList.add('active');
        
        currentSlide = slideNumber;
    }
    
    function nextSlide() {
        const next = currentSlide >= totalSlides ? 1 : currentSlide + 1;
        showSlide(next);
    }
    
    function prevSlide() {
        const prev = currentSlide <= 1 ? totalSlides : currentSlide - 1;
        showSlide(prev);
    }
    
    function startAutoPlay() {
        if (userInteracted) return;
        autoPlayInterval = setInterval(nextSlide, 12000); // Slower: change every 12 seconds
    }
    
    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }
    
    // Event listeners
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            userInteracted = true;
            stopAutoPlay();
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            userInteracted = true;
            stopAutoPlay();
        });
    }
    
    indicators.forEach(indicator => {
        indicator.addEventListener('click', () => {
            const slideNum = parseInt(indicator.getAttribute('data-slide'));
            showSlide(slideNum);
            userInteracted = true;
            stopAutoPlay();
        });
    });
    
    // Pause autoplay on hover
    const slideshowContainer = document.querySelector('.slideshow-container');
    if (slideshowContainer) {
        slideshowContainer.addEventListener('mouseenter', stopAutoPlay);
        slideshowContainer.addEventListener('mouseleave', () => {
            if (!userInteracted) startAutoPlay();
        });
    }
    
    // Start autoplay
    startAutoPlay();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupDarkMode();
    setupBudgetSlideshow();
    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav();
});
