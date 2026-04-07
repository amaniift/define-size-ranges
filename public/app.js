const tableBody = document.getElementById('tableBody');
const loading = document.getElementById('loading');
const totalCountEl = document.getElementById('totalCount');
const currentPageEl = document.getElementById('currentPage');
const totalPagesEl = document.getElementById('totalPages');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

// Filters
const filterDept = document.getElementById('filterDept');
const filterClass = document.getElementById('filterClass');
const filterSubclass = document.getElementById('filterSubclass');
const filterItemParent = document.getElementById('filterItemParent');
const filterParentDiff1 = document.getElementById('filterParentDiff1');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

let currentData = [];
let filteredData = [];
let totalRecords = 0;
const limit = 50;
let offset = 0;

function getFilterParams() {
    const params = new URLSearchParams();
    if (filterDept.value) params.append('dept', filterDept.value);
    if (filterClass.value) params.append('class', filterClass.value);
    if (filterSubclass.value) params.append('subclass', filterSubclass.value);
    if (filterItemParent.value) params.append('item_parent', filterItemParent.value);
    if (filterParentDiff1.value) params.append('parent_diff_1', filterParentDiff1.value);
    return params.toString();
}

// Fetch filters data from API
async function fetchFilters() {
    try {
        const query = getFilterParams();
        const res = await fetch(`/api/filters?${query}`);
        const result = await res.json();
        
        updateSelect(filterDept, result.dept, filterDept.value);
        updateSelect(filterClass, result.class, filterClass.value);
        updateSelect(filterSubclass, result.subclass, filterSubclass.value);
        updateSelect(filterItemParent, result.item_parent, filterItemParent.value);
        updateSelect(filterParentDiff1, result.parent_diff_1, filterParentDiff1.value);
        
    } catch (error) {
        console.error('Failed to fetch filters:', error);
    }
}

function updateSelect(selectEl, optionsData, currentValue) {
    selectEl.innerHTML = '<option value="">All</option>';
    if (optionsData && optionsData.length > 0) {
        optionsData.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (String(opt) === String(currentValue)) {
                option.selected = true;
            }
            selectEl.appendChild(option);
        });
        selectEl.disabled = false;
    } else {
        selectEl.disabled = true;
    }
}

// Fetch data from API
async function fetchData(resetOffset = false) {
    if (resetOffset) offset = 0;
    showLoading(true);
    try {
        const query = getFilterParams();
        const res = await fetch(`/api/products?limit=${limit}&offset=${offset}&${query}`);
        const result = await res.json();
        
        currentData = result.data;
        filteredData = [...currentData];
        totalRecords = result.total;
        
        // Re-apply local search if any
        applyLocalSearch(searchInput.value);
        updateUI();
    } catch (error) {
        console.error('Failed to fetch data:', error);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef4444;">Failed to load data. Ensure API is running.</td></tr>`;
    } finally {
        showLoading(false);
    }
}

function updateUI() {
    totalCountEl.textContent = totalRecords.toLocaleString();
    renderTable();
    updatePagination();
}

function renderTable() {
    tableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">No products found</td></tr>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    
    filteredData.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(item.parent_diff_1 || '-')}</td>
            <td>${escapeHtml(item.DIFF_2 || '-')}</td>
            <td>${escapeHtml(item.DIFF_2_DESC || '-')}</td>
            <td>${escapeHtml(item.ITEM_PARENT || '-')}</td>
            <td>${escapeHtml(item.SUBCLASS || '-')}</td>
            <td>${escapeHtml(item.CLASS || '-')}</td>
            <td>${escapeHtml(item.DEPT || '-')}</td>
        `;
        fragment.appendChild(tr);
    });
    
    tableBody.appendChild(fragment);
}

function updatePagination() {
    let _totalPages = Math.ceil(totalRecords / limit);
    if(_totalPages === 0) _totalPages = 1;

    const currentPage = Math.floor(offset / limit) + 1;
    
    currentPageEl.textContent = currentPage;
    totalPagesEl.textContent = _totalPages;
    
    if (currentPage <= 1) {
        prevBtn.classList.add('btn-disabled');
    } else {
        prevBtn.classList.remove('btn-disabled');
    }
    
    if (currentPage >= _totalPages) {
        nextBtn.classList.add('btn-disabled');
    } else {
        nextBtn.classList.remove('btn-disabled');
    }
}

// Event Listeners

async function handleFilterChange(e) {
    const changedId = e.target.id;
    
    // Clear dependent filters
    if (changedId === 'filterDept') {
        filterClass.value = '';
        filterSubclass.value = '';
        filterItemParent.value = '';
        filterParentDiff1.value = '';
    } else if (changedId === 'filterClass') {
        filterSubclass.value = '';
        filterItemParent.value = '';
        filterParentDiff1.value = '';
    } else if (changedId === 'filterSubclass') {
        filterItemParent.value = '';
        filterParentDiff1.value = '';
    } else if (changedId === 'filterItemParent') {
        filterParentDiff1.value = '';
    }

    await fetchFilters();
    fetchData(true);
}

filterDept.addEventListener('change', handleFilterChange);
filterClass.addEventListener('change', handleFilterChange);
filterSubclass.addEventListener('change', handleFilterChange);
filterItemParent.addEventListener('change', handleFilterChange);
filterParentDiff1.addEventListener('change', handleFilterChange);

clearFiltersBtn.addEventListener('click', () => {
    filterDept.value = '';
    filterClass.value = '';
    filterSubclass.value = '';
    filterItemParent.value = '';
    filterParentDiff1.value = '';
    fetchFilters();
    fetchData(true);
});

prevBtn.addEventListener('click', () => {
    if (offset >= limit) {
        offset -= limit;
        fetchData();
        searchInput.value = '';
    }
});

nextBtn.addEventListener('click', () => {
    const maxOffset = totalRecords - limit;
    if (offset < maxOffset) {
        offset += limit;
        fetchData();
        searchInput.value = '';
    }
});

function applyLocalSearch(term) {
    term = term.toLowerCase();
    if (!term) {
        filteredData = [...currentData];
    } else {
        filteredData = currentData.filter(item => {
            return Object.values(item).some(val => 
                val !== null && String(val).toLowerCase().includes(term)
            );
        });
    }
}

searchInput.addEventListener('input', (e) => {
    applyLocalSearch(e.target.value);
    renderTable();
});

// Utils
function showLoading(show) {
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Initial load
async function init() {
    await fetchFilters();
    fetchData();
}

init();

// --- Modal Logic ---

const viewSizeRangesBtn = document.getElementById('viewSizeRangesBtn');
const sizeRangesModal = document.getElementById('sizeRangesModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const sizeRangesBody = document.getElementById('sizeRangesBody');
const modalPrevBtn = document.getElementById('modalPrevBtn');
const modalNextBtn = document.getElementById('modalNextBtn');
const modalCurrentPageEl = document.getElementById('modalCurrentPage');
const modalTotalPagesEl = document.getElementById('modalTotalPages');
const sizeRangeIdFilter = document.getElementById('sizeRangeIdFilter');

let modalOffset = 0;
const modalLimit = 100;
let modalTotal = 0;

async function initModalFilters() {
    try {
        const res = await fetch('/api/size_range_filters');
        const result = await res.json();
        updateSelect(sizeRangeIdFilter, result.size_range_ids, sizeRangeIdFilter.value);
    } catch(error) {
        console.error('Failed to fetch modal filters:', error);
    }
}

sizeRangeIdFilter.addEventListener('change', () => {
    modalOffset = 0;
    fetchSizeRanges();
});

viewSizeRangesBtn.addEventListener('click', () => {
    sizeRangesModal.classList.remove('hidden');
    modalOffset = 0;
    initModalFilters();
    fetchSizeRanges();
});

closeModalBtn.addEventListener('click', () => {
    sizeRangesModal.classList.add('hidden');
});

// Close modal when clicking outside content
sizeRangesModal.addEventListener('click', (e) => {
    if (e.target === sizeRangesModal) {
        sizeRangesModal.classList.add('hidden');
    }
});

async function fetchSizeRanges() {
    showLoading(true);
    try {
        let url = `/api/size_ranges?limit=${modalLimit}&offset=${modalOffset}`;
        if (sizeRangeIdFilter.value) {
            url += `&size_range_id=${sizeRangeIdFilter.value}`;
        }
        const res = await fetch(url);
        const result = await res.json();
        
        modalTotal = result.total;
        
        sizeRangesBody.innerHTML = '';
        if (result.data.length === 0) {
            sizeRangesBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 2rem;">No size ranges found</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        result.data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(item.size_range_id)}</td>
                <td>${escapeHtml(item.size_range)}</td>
                <td>${escapeHtml(item.size_code)}</td>
            `;
            fragment.appendChild(tr);
        });
        sizeRangesBody.appendChild(fragment);
        updateModalPagination();
    } catch (error) {
        console.error('Failed to fetch size ranges:', error);
        sizeRangesBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ef4444;">Failed to load data.</td></tr>`;
    } finally {
        showLoading(false);
    }
}

function updateModalPagination() {
    let _totalPages = Math.ceil(modalTotal / modalLimit);
    if(_totalPages === 0) _totalPages = 1;

    const currentPage = Math.floor(modalOffset / modalLimit) + 1;
    
    modalCurrentPageEl.textContent = currentPage;
    modalTotalPagesEl.textContent = _totalPages;
    
    if (currentPage <= 1) {
        modalPrevBtn.classList.add('btn-disabled');
    } else {
        modalPrevBtn.classList.remove('btn-disabled');
    }
    
    if (currentPage >= _totalPages) {
        modalNextBtn.classList.add('btn-disabled');
    } else {
        modalNextBtn.classList.remove('btn-disabled');
    }
}

modalPrevBtn.addEventListener('click', () => {
    if (modalOffset >= modalLimit) {
        modalOffset -= modalLimit;
        fetchSizeRanges();
    }
});

modalNextBtn.addEventListener('click', () => {
    const maxOffset = modalTotal - modalLimit;
    if (modalOffset < maxOffset) {
        modalOffset += modalLimit;
        fetchSizeRanges();
    }
});
