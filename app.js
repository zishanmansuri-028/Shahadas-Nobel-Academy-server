/* ===================================================
   SHAHADAZ NOBLE ACADEMY — APP v2
   Roles: director (full), admin (full), employee (limited)
   Features: Courses, Class Sections, Animated UI, Role-Based Access
   =================================================== */

// ============================================================
// DATA STORE
// ============================================================
const DB = {
  get: (key) => JSON.parse(localStorage.getItem('sna_' + key) || '[]'),
  set: (key, val) => localStorage.setItem('sna_' + key, JSON.stringify(val)),
  getObj: (key, def={}) => JSON.parse(localStorage.getItem('sna_' + key) || JSON.stringify(def)),
  setObj: (key, val) => localStorage.setItem('sna_' + key, JSON.stringify(val))
};

// ============================================================
// USER ROLES & AUTH
// ============================================================
const USERS = {
  director:  { password: 'director123', role: 'director',  label: 'Director',   icon: 'fa-crown' },
  admin:     { password: 'admin123',    role: 'admin',     label: 'Admin',      icon: 'fa-user-shield' },
  employee:  { password: 'emp123',      role: 'employee',  label: 'Employee',   icon: 'fa-user' }
};

let currentUser = null;  // { username, role, label }

function isDirector() { return currentUser && (currentUser.role === 'director' || currentUser.role === 'admin'); }
function isEmployee()  { return currentUser && currentUser.role === 'employee'; }

// ============================================================
// UTILITIES
// ============================================================
let toastTimer = null;
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

function showAlert(title, msg) {
  document.getElementById('alertModalTitle').innerHTML = '<i class="fas fa-bell"></i> ' + title;
  document.getElementById('alertModalMsg').textContent = msg;
  openModal('alertModal');
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2,5); }
function today() { return new Date().toISOString().split('T')[0]; }

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'});
}

function daysDiff(d1, d2) {
  return Math.round((new Date(d1) - new Date(d2)) / 86400000);
}

function calcExpiry(startDate, plan) {
  const d = new Date(startDate);
  const days = {monthly:30, quarterly:90, halfyearly:180, yearly:365};
  d.setDate(d.getDate() + (days[plan] || 30));
  return d.toISOString().split('T')[0];
}

function monthName(n) {
  return ['','January','February','March','April','May','June','July','August','September','October','November','December'][parseInt(n)] || '';
}

// ============================================================
// LOGIN / LOGOUT
// ============================================================
function doLogin() {
  const uname = document.getElementById('loginUsername').value.trim();
  const pass  = document.getElementById('loginPassword').value.trim();

  if (!uname || !pass) { showLoginError('Please enter username and password.'); return; }

  const userDef = USERS[uname.toLowerCase()];
  if (!userDef || userDef.password !== pass) { showLoginError('Invalid username or password.'); return; }

  currentUser = { username: uname.toLowerCase(), role: userDef.role, label: userDef.label, icon: userDef.icon };

  document.getElementById('loginError').style.display = 'none';
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('mainApp').classList.add('active');

  applyRoleUI();
  initApp();

  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = 'block';
}

function doLogout() {
  currentUser = null;
  document.getElementById('mainApp').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
  showPage('dashboard');
}

// ============================================================
// APPLY ROLE-BASED UI
// ============================================================
function applyRoleUI() {
  if (!currentUser) return;

  // Set sidebar user info
  document.getElementById('sidebarUserName').textContent = currentUser.label;
  document.getElementById('sidebarUserRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

  // Role badge
  const rb = document.getElementById('roleBadge');
  rb.className = 'role-badge';
  if (currentUser.role === 'director') {
    rb.classList.add('role-director');
    rb.innerHTML = '<i class="fas fa-crown"></i> Director';
  } else if (currentUser.role === 'admin') {
    rb.classList.add('role-admin');
    rb.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
  } else {
    rb.classList.add('role-employee');
    rb.innerHTML = '<i class="fas fa-user"></i> Employee';
  }

  if (isEmployee()) {
    // Hide salary nav link
    document.getElementById('navSalary').style.display = 'none';
    // Hide director-only elements
    document.querySelectorAll('.director-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.director-only-btn').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.director-only-col').forEach(el => { el.style.display = 'none'; });
    // Fee stat card - hide for employee too? No, keep it. Only salary hidden
  } else {
    document.getElementById('navSalary').style.display = 'flex';
    document.querySelectorAll('.director-only').forEach(el => el.style.display = '');
    document.querySelectorAll('.director-only-btn').forEach(el => el.style.display = '');
    document.querySelectorAll('.director-only-col').forEach(el => el.style.display = '');
  }
}

// Block employee from accessing salary page
function canAccess(pageId) {
  if (isEmployee() && (pageId === 'salary' || pageId === 'reports')) {
    showToast('Access denied! You do not have permission.', 'error');
    return false;
  }
  return true;
}

// ============================================================
// NAVIGATION
// ============================================================
function showPage(pageId) {
  if (!canAccess(pageId)) return;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  const navItem = document.querySelector(`.nav-item[onclick="showPage('${pageId}')"]`);
  if (navItem) navItem.classList.add('active');

  const titles = {
    dashboard:'Dashboard', students:'Students Management',
    attendance:'Attendance Management', fees:'Fee Management',
    courses:'Courses Management', teachers:'Teachers Management',
    salary:'Salary Management', leaves:'Leave Management',
    alerts:'Fee Alerts', reports:'Reports'
  };
  document.getElementById('pageTitle').textContent = titles[pageId] || pageId;

  if (pageId === 'dashboard')  { updateDashboard(); }
  if (pageId === 'students')   { renderStudents(); renderClassSections(); }
  if (pageId === 'fees')       { renderFees(); renderFeePlans(); }
  if (pageId === 'teachers')   { renderTeachers(); }
  if (pageId === 'salary')     { renderSalaryTable(); }
  if (pageId === 'leaves')     { renderLeaves(); }
  if (pageId === 'alerts')     { renderAlerts(); }
  if (pageId === 'courses')    { renderCourses(); }

  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============================================================
// MODALS
// ============================================================
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}
function closeOnOverlay(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ============================================================
// APP INIT
// ============================================================
function initApp() {
  updateDashboard();
  checkAlerts();
  populateStudentDropdowns();
  populateTeacherDropdowns();
  populateCourseDropdown();

  const d = today();
  ['attendanceDate','fDate','fPlanStart','sPlanStart','salDate','lvFrom','lvTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = d;
  });
  const now = new Date();
  const smEl = document.getElementById('salaryMonth');
  if (smEl) smEl.value = now.getMonth() + 1;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPassword').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  document.getElementById('loginUsername').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  updateTopbarDate();
});

function updateTopbarDate() {
  const el = document.getElementById('topbarDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-IN', {weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  setTimeout(updateTopbarDate, 60000);
}

// ============================================================
// COURSES MANAGEMENT
// ============================================================
function saveCourse() {
  if (isEmployee()) { showToast('Permission denied!', 'error'); return; }

  const editId = document.getElementById('editCourseId').value;
  const name   = document.getElementById('cName').value.trim();
  const desc   = document.getElementById('cDesc').value.trim();
  const dur    = document.getElementById('cDuration').value.trim();
  const fee    = document.getElementById('cFee').value;
  const icon   = document.getElementById('cIcon').value.trim() || '📚';

  if (!name) { showToast('Course name is required!', 'error'); return; }

  let courses = DB.get('courses');

  if (editId) {
    const idx = courses.findIndex(c => c.id === editId);
    if (idx >= 0) {
      courses[idx] = { ...courses[idx], name, desc, duration: dur, fee: Number(fee), icon };
      showToast(`Course "${name}" updated!`);
    }
  } else {
    courses.push({ id: genId(), name, desc, duration: dur, fee: Number(fee)||0, icon, createdAt: today() });
    showToast(`Course "${name}" added!`);
  }

  DB.set('courses', courses);
  closeModal('addCourseModal');
  clearCourseForm();
  renderCourses();
  updateDashboard();
  populateCourseDropdown();
  renderDashCourses();
}

function clearCourseForm() {
  ['editCourseId','cName','cDesc','cDuration','cFee','cIcon'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function editCourse(id) {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  const course = DB.get('courses').find(c => c.id === id);
  if (!course) return;
  document.getElementById('editCourseId').value = course.id;
  document.getElementById('cName').value = course.name;
  document.getElementById('cDesc').value = course.desc || '';
  document.getElementById('cDuration').value = course.duration || '';
  document.getElementById('cFee').value = course.fee || '';
  document.getElementById('cIcon').value = course.icon || '';
  openModal('addCourseModal');
}

function deleteCourse(id) {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  if (!confirm('Delete this course?')) return;
  let courses = DB.get('courses').filter(c => c.id !== id);
  DB.set('courses', courses);
  renderCourses();
  updateDashboard();
  populateCourseDropdown();
  renderDashCourses();
  showToast('Course deleted.', 'warning');
}

function renderCourses() {
  const courses = DB.get('courses');
  const students = DB.get('students');
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  if (courses.length === 0) {
    grid.innerHTML = '<p class="empty-state">No courses added yet. Click "Add Course" to begin.</p>';
    return;
  }

  grid.innerHTML = courses.map(c => {
    const enrolled = students.filter(s => s.course === c.name).length;
    const actions = isDirector()
      ? `<button class="btn-edit btn-sm" onclick="editCourse('${c.id}')"><i class="fas fa-edit"></i> Edit</button>
         <button class="btn-danger btn-sm" onclick="deleteCourse('${c.id}')"><i class="fas fa-trash"></i></button>`
      : `<span class="status-badge badge-pink">View Only</span>`;
    return `<div class="course-big-card">
      <div class="course-icon">${c.icon || '📚'}</div>
      <h3 class="course-name">${c.name}</h3>
      <p class="course-desc">${c.desc || 'No description provided.'}</p>
      <div class="course-meta">
        ${c.duration ? `<span><i class="fas fa-clock"></i> ${c.duration}</span>` : ''}
        ${c.fee ? `<span>₹${Number(c.fee).toLocaleString('en-IN')}</span>` : ''}
      </div>
      <p class="course-count">Enrolled Students: <strong>${enrolled}</strong></p>
      <div class="course-actions">${actions}</div>
    </div>`;
  }).join('');
}

function renderDashCourses() {
  const courses = DB.get('courses');
  const el = document.getElementById('dashCourses');
  if (!el) return;
  if (courses.length === 0) {
    el.innerHTML = '<p style="color:var(--text-light);font-size:12.5px;">No courses added yet.</p>';
    return;
  }
  el.innerHTML = courses.map(c =>
    `<span class="course-chip">${c.icon || '📚'} ${c.name}</span>`
  ).join('');
}

function populateCourseDropdown() {
  const courses = DB.get('courses');
  const sel = document.getElementById('sCourse');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Course</option>' +
    courses.map(c => `<option value="${c.name}">${c.icon || ''} ${c.name}</option>`).join('');
}

// ============================================================
// DASHBOARD
// ============================================================
function updateDashboard() {
  const students = DB.get('students');
  const teachers = DB.get('teachers');
  const fees     = DB.get('fees');
  const courses  = DB.get('courses');

  document.getElementById('statStudents').textContent = students.length;
  document.getElementById('statTeachers').textContent = teachers.length;
  document.getElementById('statCourses').textContent  = courses.length;

  const now = new Date();
  const thisMonthFees = fees.filter(f => {
    const fd = new Date(f.date);
    return fd.getMonth() === now.getMonth() && fd.getFullYear() === now.getFullYear();
  });
  const total = thisMonthFees.reduce((s,f) => s + Number(f.amount), 0);

  const feeStatCard = document.getElementById('feeStatCard');
  if (feeStatCard) feeStatCard.style.display = isEmployee() ? 'none' : '';
  document.getElementById('statFeeCollected').textContent = '₹' + total.toLocaleString('en-IN');

  const alerts = getExpiringStudents();
  document.getElementById('statAlerts').textContent = alerts.length;

  // Upcoming renewals
  const renewalContainer = document.getElementById('upcomingRenewals');
  if (alerts.length === 0) {
    renewalContainer.innerHTML = '<p class="empty-state">No upcoming renewals in the next 7 days</p>';
  } else {
    renewalContainer.innerHTML = alerts.slice(0,5).map(a => `
      <div class="renewal-item">
        <div class="ri-icon"><i class="fas fa-clock"></i></div>
        <div class="ri-info">
          <h4>${a.name}</h4>
          <p>${a.class} | ${a.course || 'N/A'} | Parent: ${a.parent} | ${a.phone}</p>
          <p>Expires: ${formatDate(a.expiry)}</p>
        </div>
        <div class="ri-days">${a.days === 0 ? 'Today!' : a.days + 'd'}</div>
      </div>`).join('');
  }

  // Today's attendance
  const att = DB.get('attendance').filter(a => a.date === today());
  const present = att.filter(a => a.status === 'present').length;
  const attContainer = document.getElementById('todayAttendance');
  if (att.length === 0) {
    attContainer.innerHTML = '<p class="empty-state">No attendance marked today</p>';
  } else {
    attContainer.innerHTML = `
      <div style="display:flex;gap:18px;flex-wrap:wrap;">
        <div style="text-align:center"><div style="font-size:26px;font-weight:700;color:var(--success)">${present}</div><div style="font-size:11px;color:var(--text-light)">Present</div></div>
        <div style="text-align:center"><div style="font-size:26px;font-weight:700;color:var(--danger)">${att.length-present}</div><div style="font-size:11px;color:var(--text-light)">Absent</div></div>
        <div style="text-align:center"><div style="font-size:26px;font-weight:700;color:var(--burgundy)">${att.length}</div><div style="font-size:11px;color:var(--text-light)">Total</div></div>
      </div>`;
  }

  renderDashCourses();
}

// ============================================================
// CLASS SECTIONS
// ============================================================
function renderClassSections() {
  const students = DB.get('students');
  const classNames = ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10'];
  const classEmojis = ['🏫','📖','✏️','🔬','🎨','🧮','📐','🔭','🧪','🎓'];
  const container = document.getElementById('classSectionCards');
  if (!container) return;

  const classData = classNames.map((cn, i) => ({
    name: cn,
    emoji: classEmojis[i],
    count: students.filter(s => s.class === cn).length
  }));

  container.innerHTML = classData.map(c => `
    <div class="class-card" onclick="filterByClass('${c.name}', this)">
      <div class="cc-icon">${c.emoji}</div>
      <div class="cc-name">${c.name}</div>
      <div class="cc-count">${c.count} student${c.count !== 1 ? 's' : ''}</div>
    </div>`).join('');
}

function filterByClass(className, el) {
  document.querySelectorAll('.class-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('filterClass').value = className;
  filterStudents();
}

// ============================================================
// STUDENTS
// ============================================================
function addStudent() {
  const name     = document.getElementById('sName').value.trim();
  const cls      = document.getElementById('sClass').value;
  const course   = document.getElementById('sCourse').value;
  const parent   = document.getElementById('sParent').value.trim();
  const phone    = document.getElementById('sPhone').value.trim();
  const dob      = document.getElementById('sDob').value;
  const gender   = document.getElementById('sGender').value;
  const address  = document.getElementById('sAddress').value.trim();
  const feePlan  = document.getElementById('sFeePlan').value;
  const planStart= document.getElementById('sPlanStart').value;
  const feeAmt   = document.getElementById('sFeeAmount').value;

  if (!name || !cls || !parent || !phone || !feePlan || !planStart || !feeAmt) {
    showToast('Please fill all required fields!', 'error'); return;
  }

  const expiry = calcExpiry(planStart, feePlan);
  const student = {
    id: genId(), name, class: cls, course: course || '', parent, phone, dob,
    gender, address, feePlan, planStart, feeAmount: Number(feeAmt), expiry,
    status: 'active', createdAt: today()
  };

  const students = DB.get('students');
  students.push(student);
  DB.set('students', students);
  closeModal('addStudentModal');
  clearStudentForm();
  renderStudents();
  renderClassSections();
  populateStudentDropdowns();
  updateDashboard();
  showToast(`Student "${name}" added successfully!`);
}

function clearStudentForm() {
  ['sName','sClass','sCourse','sParent','sPhone','sDob','sGender','sAddress','sFeePlan','sFeeAmount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('sPlanStart').value = today();
}

function deleteStudent(id) {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  if (!confirm('Delete this student?')) return;
  DB.set('students', DB.get('students').filter(s => s.id !== id));
  renderStudents();
  renderClassSections();
  populateStudentDropdowns();
  updateDashboard();
  showToast('Student deleted.', 'warning');
}

function renderStudents(data) {
  const students = data || DB.get('students');
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No students added yet. Click "Add Student" to begin.</td></tr>';
    return;
  }

  const planLabel = {monthly:'Monthly', quarterly:'Quarterly', halfyearly:'Half Yearly', yearly:'Yearly'};
  tbody.innerHTML = students.map((s, i) => {
    const daysLeft = daysDiff(s.expiry, today());
    let statusBadge;
    if (daysLeft < 0) statusBadge = '<span class="status-badge badge-danger">Expired</span>';
    else if (daysLeft <= 3) statusBadge = '<span class="status-badge badge-warning">Expiring Soon</span>';
    else statusBadge = '<span class="status-badge badge-success">Active</span>';

    const actions = isDirector()
      ? `<button class="btn-danger btn-sm" onclick="deleteStudent('${s.id}')"><i class="fas fa-trash"></i></button>`
      : `<span style="color:var(--text-light);font-size:11px;">No Access</span>`;

    return `<tr>
      <td>${i+1}</td>
      <td><strong>${s.name}</strong></td>
      <td><span class="status-badge badge-pink">${s.class}</span></td>
      <td>${s.course ? `<span class="status-badge badge-gold">${s.course}</span>` : '—'}</td>
      <td>${s.parent}</td>
      <td>${s.phone}</td>
      <td>${planLabel[s.feePlan] || s.feePlan}</td>
      <td>${formatDate(s.expiry)}</td>
      <td>${statusBadge}</td>
      <td class="action-btns director-only-col">${actions}</td>
    </tr>`;
  }).join('');
}

function filterStudents() {
  const q   = document.getElementById('studentSearch').value.toLowerCase();
  const cls = document.getElementById('filterClass') ? document.getElementById('filterClass').value : '';
  let students = DB.get('students').filter(s => {
    const matchQ = !q ||
      s.name.toLowerCase().includes(q) ||
      s.class.toLowerCase().includes(q) ||
      (s.course||'').toLowerCase().includes(q) ||
      s.parent.toLowerCase().includes(q) ||
      s.phone.includes(q);
    const matchClass = !cls || s.class === cls;
    return matchQ && matchClass;
  });
  renderStudents(students);
}

// ============================================================
// ATTENDANCE
// ============================================================
function loadAttendance() {
  const date = document.getElementById('attendanceDate').value;
  const cls  = document.getElementById('attendanceClass').value;
  if (!date) { showToast('Please select a date!', 'error'); return; }

  let students = DB.get('students');
  if (cls) students = students.filter(s => s.class === cls);

  const existingAtt = DB.get('attendance').filter(a => a.date === date && (!cls || a.class === cls));
  const attMap = {};
  existingAtt.forEach(a => { attMap[a.studentId] = a; });

  const tbody = document.getElementById('attendanceTableBody');
  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No students found.</td></tr>';
    updateAttSummary(0, 0); return;
  }

  tbody.innerHTML = students.map((s,i) => {
    const att    = attMap[s.id];
    const status = att ? att.status : 'present';
    const remark = att ? (att.remark || '') : '';
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${s.name}</strong></td>
      <td>${s.class}</td>
      <td>${s.course || '—'}</td>
      <td>
        <div class="att-toggle">
          <button class="att-btn ${status==='present'?'present':''}" onclick="setAttStatus(this,'present')" data-sid="${s.id}"><i class="fas fa-check"></i> Present</button>
          <button class="att-btn ${status==='absent'?'absent':''}"  onclick="setAttStatus(this,'absent')"  data-sid="${s.id}"><i class="fas fa-times"></i> Absent</button>
        </div>
      </td>
      <td><input type="text" value="${remark}" placeholder="Remark..." data-sid="${s.id}"
           class="att-remark" style="border:1px solid var(--border);padding:4px 8px;border-radius:6px;font-size:12px;width:110px;" /></td>
    </tr>`;
  }).join('');

  updateAttSummaryFromTable();
}

function setAttStatus(btn, status) {
  const parent = btn.closest('td').querySelectorAll('.att-btn');
  parent.forEach(b => b.classList.remove('present','absent'));
  btn.classList.add(status);
  updateAttSummaryFromTable();
}

function updateAttSummaryFromTable() {
  const present = document.querySelectorAll('.att-btn.present').length;
  const total   = document.querySelectorAll('#attendanceTableBody tr').length;
  updateAttSummary(present, total - present);
}

function updateAttSummary(present, absent) {
  document.getElementById('attPresent').textContent = present;
  document.getElementById('attAbsent').textContent  = absent;
  document.getElementById('attTotal').textContent   = present + absent;
}

function saveAttendance() {
  const date = document.getElementById('attendanceDate').value;
  const cls  = document.getElementById('attendanceClass').value;
  if (!date) { showToast('Please select a date!', 'error'); return; }

  const rows = document.querySelectorAll('#attendanceTableBody tr');
  if (!rows.length || rows[0].cells.length < 3) {
    showToast('Please load attendance first!', 'error'); return;
  }

  let allAtt = DB.get('attendance').filter(a => !(a.date === date && (!cls || a.class === cls)));
  let students = DB.get('students');
  if (cls) students = students.filter(s => s.class === cls);

  const newRecords = students.map(s => {
    const absBtn  = document.querySelector(`.att-btn.absent[data-sid="${s.id}"]`);
    const remarkEl= document.querySelector(`.att-remark[data-sid="${s.id}"]`);
    return {
      id: genId(), studentId: s.id, studentName: s.name,
      class: s.class, course: s.course||'', date,
      status: absBtn ? 'absent' : 'present',
      remark: remarkEl ? remarkEl.value : ''
    };
  });

  DB.set('attendance', [...allAtt, ...newRecords]);
  showToast(`Attendance saved for ${newRecords.length} students!`);
  updateDashboard();
}

function exportAttendanceExcel() {
  if (isEmployee()) { showToast('Permission denied!', 'error'); return; }
  const date = document.getElementById('attendanceDate') ? document.getElementById('attendanceDate').value : '';
  let att = DB.get('attendance');
  if (date) att = att.filter(a => a.date === date);
  if (!att.length) { showToast('No attendance data to export!', 'warning'); return; }

  const data = att.map((a,i) => ({
    'S.No': i+1, 'Student Name': a.studentName, 'Class': a.class, 'Course': a.course||'',
    'Date': a.date, 'Status': a.status.charAt(0).toUpperCase()+a.status.slice(1), 'Remark': a.remark||''
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, date ? `Attendance_${date}.xlsx` : 'Attendance_All.xlsx');
  showToast('Attendance exported to Excel!');
}

// ============================================================
// FEE MANAGEMENT
// ============================================================
function populateStudentDropdowns() {
  const students = DB.get('students');
  const opts = '<option value="">Select Student</option>' +
    students.map(s => `<option value="${s.id}">${s.name} (${s.class})</option>`).join('');
  ['fStudent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
}

function recordFeePayment() {
  const studentId = document.getElementById('fStudent').value;
  const amount    = document.getElementById('fAmount').value;
  const date      = document.getElementById('fDate').value;
  const mode      = document.getElementById('fMode').value;
  const planStart = document.getElementById('fPlanStart').value;
  const newPlan   = document.getElementById('fNewPlan').value;
  const remarks   = document.getElementById('fRemarks').value;

  if (!studentId || !amount || !date) { showToast('Please fill Student, Amount and Date!', 'error'); return; }

  const students = DB.get('students');
  const student  = students.find(s => s.id === studentId);
  if (!student) return;

  if (newPlan && planStart) {
    const idx = students.findIndex(s => s.id === studentId);
    students[idx].feePlan  = newPlan;
    students[idx].planStart= planStart;
    students[idx].expiry   = calcExpiry(planStart, newPlan);
    DB.set('students', students);
  }

  const receipt = 'REC' + Date.now().toString().slice(-6);
  const fee = {
    id: genId(), studentId, studentName: student.name, class: student.class,
    amount: Number(amount), date, mode, receipt, remarks
  };

  const fees = DB.get('fees');
  fees.push(fee);
  DB.set('fees', fees);
  closeModal('addFeeModal');
  clearFeeForm();
  renderFees();
  renderFeePlans();
  updateDashboard();
  showToast(`Payment recorded! Receipt: ${receipt}`);
}

function clearFeeForm() {
  ['fStudent','fAmount','fMode','fPlanStart','fNewPlan','fRemarks'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('fDate').value = today();
  document.getElementById('fMode').value = 'Cash';
}

function deleteFee(id) {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  if (!confirm('Delete this payment record?')) return;
  DB.set('fees', DB.get('fees').filter(f => f.id !== id));
  renderFees();
  updateDashboard();
  showToast('Record deleted.', 'warning');
}

function renderFees(data) {
  const fees = data || [...DB.get('fees')].reverse();
  const tbody = document.getElementById('feeTableBody');
  if (!tbody) return;
  if (!fees.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No fee records found.</td></tr>'; return;
  }
  tbody.innerHTML = fees.map((f,i) => {
    const delBtn = isDirector()
      ? `<button class="btn-danger btn-sm" onclick="deleteFee('${f.id}')"><i class="fas fa-trash"></i></button>`
      : '';
    return `<tr>
      <td>${i+1}</td><td><strong>${f.studentName}</strong></td><td>${f.class}</td>
      <td><strong>₹${Number(f.amount).toLocaleString('en-IN')}</strong></td>
      <td>${formatDate(f.date)}</td>
      <td><span class="status-badge badge-info">${f.mode}</span></td>
      <td><span class="status-badge badge-pink">${f.receipt}</span></td>
      <td class="action-btns director-only-col">${delBtn}</td>
    </tr>`;
  }).join('');
}

function filterFees() {
  const q = document.getElementById('feeSearch').value.toLowerCase();
  renderFees([...DB.get('fees')].filter(f => f.studentName.toLowerCase().includes(q)).reverse());
}

function renderFeePlans() {
  const students = DB.get('students');
  const tbody = document.getElementById('feePlanTableBody');
  if (!tbody) return;
  if (!students.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No students added yet.</td></tr>'; return;
  }
  const planLabel = {monthly:'Monthly', quarterly:'Quarterly', halfyearly:'Half Yearly', yearly:'Yearly'};
  tbody.innerHTML = students.map((s,i) => {
    const daysLeft = daysDiff(s.expiry, today());
    let badge = daysLeft < 0 ? 'badge-danger' : daysLeft <= 3 ? 'badge-warning' : 'badge-success';
    let statusText = daysLeft < 0 ? 'Expired' : daysLeft <= 3 ? `${daysLeft}d left` : `${daysLeft} days`;
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${s.name}</strong><br><small>${s.class}</small></td>
      <td>${s.course ? `<span class="status-badge badge-gold">${s.course}</span>` : '—'}</td>
      <td>${planLabel[s.feePlan]||s.feePlan}</td>
      <td>${formatDate(s.planStart)}</td>
      <td>${formatDate(s.expiry)}</td>
      <td>${daysLeft < 0 ? '<span style="color:var(--danger)">Overdue</span>' : daysLeft}</td>
      <td><span class="status-badge ${badge}">${statusText}</span></td>
    </tr>`;
  }).join('');
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function exportFeeExcel() {
  const fees = DB.get('fees');
  if (!fees.length) { showToast('No fee data to export!', 'warning'); return; }
  const ws = XLSX.utils.json_to_sheet(fees.map((f,i) => ({
    'S.No':i+1,'Student Name':f.studentName,'Class':f.class,
    'Amount (₹)':f.amount,'Date':f.date,'Mode':f.mode,'Receipt':f.receipt,'Remarks':f.remarks||''
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fee Records');
  XLSX.writeFile(wb, 'Fee_Records.xlsx');
  showToast('Fee records exported!');
}

// ============================================================
// TEACHERS
// ============================================================
let teacherFileData = {};

function handleFileUpload(inputId, previewId) {
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    teacherFileData[inputId] = { name: file.name, data: e.target.result, type: file.type };
    document.getElementById(previewId).textContent = '✓ ' + file.name;
  };
  reader.readAsDataURL(file);
}

function addTeacher() {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  const name    = document.getElementById('tName').value.trim();
  const subject = document.getElementById('tSubject').value.trim();
  const phone   = document.getElementById('tPhone').value.trim();
  const salary  = document.getElementById('tSalary').value;

  if (!name || !subject || !phone || !salary) {
    showToast('Please fill all required fields!', 'error'); return;
  }

  const teacher = {
    id: genId(), name, subject, phone,
    email:         document.getElementById('tEmail').value.trim(),
    qualification: document.getElementById('tQualification').value.trim(),
    joinDate:      document.getElementById('tJoinDate').value,
    salary:        Number(salary),
    aadhar:        document.getElementById('tAadhar').value.trim(),
    pan:           document.getElementById('tPan').value.trim(),
    address:       document.getElementById('tAddress').value.trim(),
    aadharFile:    teacherFileData['tAadharFile'] || null,
    panFile:       teacherFileData['tPanFile'] || null,
    createdAt:     today()
  };

  const teachers = DB.get('teachers');
  teachers.push(teacher);
  DB.set('teachers', teachers);
  teacherFileData = {};
  closeModal('addTeacherModal');
  clearTeacherForm();
  renderTeachers();
  populateTeacherDropdowns();
  updateDashboard();
  showToast(`Teacher "${name}" added!`);
}

function clearTeacherForm() {
  ['tName','tSubject','tPhone','tEmail','tQualification','tJoinDate','tSalary','tAadhar','tPan','tAddress'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['tAadharFile','tPanFile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['tAadharFilePreview','tPanFilePreview'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function deleteTeacher(id) {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  if (!confirm('Delete this teacher?')) return;
  DB.set('teachers', DB.get('teachers').filter(t => t.id !== id));
  renderTeachers();
  populateTeacherDropdowns();
  updateDashboard();
  showToast('Teacher deleted.', 'warning');
}

function viewTeacher(id) {
  const t = DB.get('teachers').find(t => t.id === id);
  if (!t) return;
  const salaries = DB.get('salaries').filter(s => s.teacherId === id);
  const leaves   = DB.get('leaves').filter(l => l.teacherId === id);
  const totalPaid = salaries.reduce((s, r) => s + Number(r.netSalary), 0);
  const totalLeaves = leaves.reduce((s, l) => s + Number(l.days), 0);

  const salarySection = isDirector()
    ? `<div class="profile-item"><label>Monthly Salary</label><p>₹${Number(t.salary).toLocaleString('en-IN')}</p></div>
       <div class="profile-item"><label>Total Salary Paid</label><p>₹${totalPaid.toLocaleString('en-IN')}</p></div>
       <div class="profile-item"><label>Aadhar Number</label><p>${t.aadhar || '—'}</p></div>
       <div class="profile-item"><label>PAN Number</label><p>${t.pan || '—'}</p></div>`
    : `<div class="profile-item"><label>Salary</label><p><em style="color:var(--text-light)">Restricted</em></p></div>`;

  const docSection = isDirector() ? `
    ${t.aadharFile ? `<div style="margin-top:12px;"><p style="font-weight:600;color:var(--burgundy);margin-bottom:6px;"><i class="fas fa-id-card"></i> Aadhar Card</p>
      ${t.aadharFile.type && t.aadharFile.type.startsWith('image/') 
        ? `<img src="${t.aadharFile.data}" style="max-width:100%;border-radius:8px;border:1px solid var(--border);" />`
        : `<a href="${t.aadharFile.data}" download="${t.aadharFile.name}" class="btn-primary btn-sm"><i class="fas fa-download"></i> Download</a>`}
    </div>` : ''}
    ${t.panFile ? `<div style="margin-top:12px;"><p style="font-weight:600;color:var(--burgundy);margin-bottom:6px;"><i class="fas fa-id-card"></i> PAN Card</p>
      ${t.panFile.type && t.panFile.type.startsWith('image/')
        ? `<img src="${t.panFile.data}" style="max-width:100%;border-radius:8px;border:1px solid var(--border);" />`
        : `<a href="${t.panFile.data}" download="${t.panFile.name}" class="btn-primary btn-sm"><i class="fas fa-download"></i> Download</a>`}
    </div>` : ''}` : '';

  document.getElementById('teacherProfileContent').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar"><i class="fas fa-user-tie"></i></div>
      <div class="profile-info">
        <h3>${t.name}</h3>
        <p>${t.subject} | ${t.qualification || 'N/A'}</p>
        <p><i class="fas fa-phone"></i> ${t.phone}</p>
      </div>
    </div>
    <div class="profile-grid">
      <div class="profile-item"><label>Email</label><p>${t.email || '—'}</p></div>
      <div class="profile-item"><label>Join Date</label><p>${formatDate(t.joinDate)}</p></div>
      ${salarySection}
      <div class="profile-item"><label>Address</label><p>${t.address || '—'}</p></div>
      <div class="profile-item"><label>Total Leaves Taken</label><p>${totalLeaves} day(s)</p></div>
    </div>
    ${docSection}`;
  openModal('viewTeacherModal');
}

function renderTeachers(data) {
  const teachers = data || DB.get('teachers');
  const tbody    = document.getElementById('teachersTableBody');
  if (!tbody) return;

  if (!teachers.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No teachers added yet.</td></tr>'; return;
  }

  tbody.innerHTML = teachers.map((t, i) => {
    // Employee: only name, subject, phone, join date shown. Salary/Aadhar/PAN hidden via CSS
    const salaryCell  = isDirector() ? `₹${Number(t.salary).toLocaleString('en-IN')}/mo` : '<em style="color:var(--text-light);font-size:11px;">Restricted</em>';
    const aadharCell  = isDirector() ? (t.aadhar ? '<span class="status-badge badge-success">✓</span>' : '<span class="status-badge badge-warning">—</span>') : '<em style="font-size:11px;">—</em>';
    const panCell     = isDirector() ? (t.pan    ? '<span class="status-badge badge-success">✓</span>' : '<span class="status-badge badge-warning">—</span>') : '<em style="font-size:11px;">—</em>';
    const delBtn      = isDirector() ? `<button class="btn-danger btn-sm" onclick="deleteTeacher('${t.id}')"><i class="fas fa-trash"></i></button>` : '';

    return `<tr>
      <td>${i+1}</td>
      <td><strong>${t.name}</strong></td>
      <td>${t.subject}</td>
      <td>${t.phone}</td>
      <td class="director-only-col">${salaryCell}</td>
      <td class="director-only-col">${aadharCell}</td>
      <td class="director-only-col">${panCell}</td>
      <td>${formatDate(t.joinDate)}</td>
      <td class="action-btns">
        <button class="btn-info btn-sm" onclick="viewTeacher('${t.id}')"><i class="fas fa-eye"></i></button>
        ${delBtn}
      </td>
    </tr>`;
  }).join('');
}

function filterTeachers() {
  const q = document.getElementById('teacherSearch').value.toLowerCase();
  renderTeachers(DB.get('teachers').filter(t =>
    t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.phone.includes(q)
  ));
}

function exportStudentsExcel() {
  const students = DB.get('students');
  if (!students.length) { showToast('No student data!', 'warning'); return; }
  const planLabel = {monthly:'Monthly',quarterly:'Quarterly',halfyearly:'Half Yearly',yearly:'Yearly'};
  const ws = XLSX.utils.json_to_sheet(students.map((s,i) => ({
    'S.No':i+1,'Name':s.name,'Class':s.class,'Course':s.course||'',
    'Parent':s.parent,'Phone':s.phone,'DOB':s.dob,'Gender':s.gender,
    'Fee Plan':planLabel[s.feePlan]||s.feePlan,'Fee Amount':s.feeAmount,
    'Plan Start':s.planStart,'Expiry':s.expiry
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, 'Students_List.xlsx');
  showToast('Student list exported!');
}

// ============================================================
// SALARY MANAGEMENT
// ============================================================
function populateTeacherDropdowns() {
  const teachers = DB.get('teachers');
  const opts = '<option value="">Select Teacher</option>' +
    teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  ['salTeacher','lvTeacher'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
}

function autoFillSalary() {
  const id = document.getElementById('salTeacher').value;
  const t  = DB.get('teachers').find(t => t.id === id);
  if (t) document.getElementById('salBasic').value = t.salary;
}

function paySalary() {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  const teacherId  = document.getElementById('salTeacher').value;
  const month      = document.getElementById('salMonth').value;
  const year       = document.getElementById('salYear').value;
  const basic      = document.getElementById('salBasic').value;
  const deductions = document.getElementById('salDeductions').value || 0;
  const date       = document.getElementById('salDate').value;
  const notes      = document.getElementById('salNotes').value;

  if (!teacherId || !basic || !date) { showToast('Fill all required fields!', 'error'); return; }

  const teacher    = DB.get('teachers').find(t => t.id === teacherId);
  if (!teacher) return;

  const netSalary = Number(basic) - Number(deductions);
  const record = {
    id: genId(), teacherId, teacherName: teacher.name,
    month: Number(month), year: Number(year),
    basicSalary: Number(basic), deductions: Number(deductions), netSalary,
    date, notes, paidAt: today()
  };

  const salaries = DB.get('salaries');
  salaries.push(record);
  DB.set('salaries', salaries);
  closeModal('paySalaryModal');
  clearSalaryForm();
  renderSalaryTable();
  showToast(`₹${netSalary.toLocaleString('en-IN')} paid to ${teacher.name}!`);
}

function clearSalaryForm() {
  ['salTeacher','salBasic','salDate','salNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('salDeductions').value = 0;
  document.getElementById('salDate').value = today();
}

function loadSalaryRecords() { renderSalaryTable(); }

function renderSalaryTable() {
  const month = Number(document.getElementById('salaryMonth').value);
  const year  = Number(document.getElementById('salaryYear').value);
  let salaries = DB.get('salaries').filter(s => s.month === month && s.year === year);
  const tbody  = document.getElementById('salaryTableBody');
  if (!tbody) return;
  if (!salaries.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No salary records for ${monthName(month)} ${year}.</td></tr>`;
    return;
  }
  tbody.innerHTML = salaries.map((s,i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${s.teacherName}</strong></td>
      <td>${monthName(s.month)} ${s.year}</td>
      <td>₹${Number(s.basicSalary).toLocaleString('en-IN')}</td>
      <td>${s.deductions > 0 ? '<span style="color:var(--danger)">-₹'+Number(s.deductions).toLocaleString('en-IN')+'</span>' : '₹0'}</td>
      <td><strong>₹${Number(s.netSalary).toLocaleString('en-IN')}</strong></td>
      <td>${formatDate(s.date)}</td>
      <td><span class="status-badge badge-success"><i class="fas fa-check"></i> Paid</span></td>
    </tr>`).join('');
}

function exportSalaryExcel() {
  const salaries = DB.get('salaries');
  if (!salaries.length) { showToast('No salary data!', 'warning'); return; }
  const ws = XLSX.utils.json_to_sheet(salaries.map((s,i) => ({
    'S.No':i+1,'Teacher':s.teacherName,'Month':monthName(s.month),'Year':s.year,
    'Basic (₹)':s.basicSalary,'Deductions (₹)':s.deductions,'Net (₹)':s.netSalary,
    'Date':s.date,'Notes':s.notes||''
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Salary');
  XLSX.writeFile(wb, 'Salary_Records.xlsx');
  showToast('Salary records exported!');
}

// ============================================================
// LEAVE MANAGEMENT
// ============================================================
function applyLeave() {
  const teacherId = document.getElementById('lvTeacher').value;
  const type      = document.getElementById('lvType').value;
  const from      = document.getElementById('lvFrom').value;
  const to        = document.getElementById('lvTo').value;
  const reason    = document.getElementById('lvReason').value;

  if (!teacherId || !from || !to) { showToast('Fill all required fields!', 'error'); return; }

  const teacher = DB.get('teachers').find(t => t.id === teacherId);
  if (!teacher) return;

  const days = daysDiff(to, from) + 1;
  if (days <= 0) { showToast('Invalid date range!', 'error'); return; }

  const leave = {
    id: genId(), teacherId, teacherName: teacher.name,
    type, from, to, days, reason, status: 'Pending', appliedAt: today()
  };

  const leaves = DB.get('leaves');
  leaves.push(leave);
  DB.set('leaves', leaves);
  closeModal('addLeaveModal');
  clearLeaveForm();
  renderLeaves();
  showToast(`Leave applied for ${teacher.name} (${days} day${days>1?'s':''})`);
}

function clearLeaveForm() {
  ['lvTeacher','lvType','lvFrom','lvTo','lvReason'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('lvFrom').value = today();
  document.getElementById('lvTo').value   = today();
}

function approveLeave(id) {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  let leaves = DB.get('leaves');
  const idx  = leaves.findIndex(l => l.id === id);
  if (idx >= 0) { leaves[idx].status = 'Approved'; DB.set('leaves', leaves); }
  renderLeaves();
  showToast('Leave approved!');
}

function rejectLeave(id) {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  let leaves = DB.get('leaves');
  const idx  = leaves.findIndex(l => l.id === id);
  if (idx >= 0) { leaves[idx].status = 'Rejected'; DB.set('leaves', leaves); }
  renderLeaves();
  showToast('Leave rejected.', 'warning');
}

function deleteLeave(id) {
  if (!isDirector()) { showToast('Permission denied!', 'error'); return; }
  if (!confirm('Delete this leave?')) return;
  DB.set('leaves', DB.get('leaves').filter(l => l.id !== id));
  renderLeaves();
  showToast('Leave deleted.', 'warning');
}

function renderLeaves() {
  const leaves = [...DB.get('leaves')].reverse();
  const tbody  = document.getElementById('leavesTableBody');
  if (!tbody) return;
  if (!leaves.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No leave records.</td></tr>'; return;
  }
  tbody.innerHTML = leaves.map((l,i) => {
    const badge = l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-warning';
    const actions = isDirector() && l.status === 'Pending'
      ? `<button class="btn-approve btn-sm" onclick="approveLeave('${l.id}')">✓</button>
         <button class="btn-reject btn-sm" onclick="rejectLeave('${l.id}')">✗</button>
         <button class="btn-danger btn-sm" onclick="deleteLeave('${l.id}')"><i class="fas fa-trash"></i></button>`
      : isDirector()
        ? `<button class="btn-danger btn-sm" onclick="deleteLeave('${l.id}')"><i class="fas fa-trash"></i></button>`
        : '';
    return `<tr>
      <td>${i+1}</td><td><strong>${l.teacherName}</strong></td><td>${l.type}</td>
      <td>${formatDate(l.from)}</td><td>${formatDate(l.to)}</td>
      <td>${l.days}d</td><td>${l.reason||'—'}</td>
      <td><span class="status-badge ${badge}">${l.status}</span></td>
      <td class="action-btns">${actions}</td>
    </tr>`;
  }).join('');
}

// ============================================================
// FEE ALERTS
// ============================================================
function getExpiringStudents() {
  return DB.get('students')
    .map(s => ({ ...s, days: daysDiff(s.expiry, today()) }))
    .filter(s => s.days >= 0 && s.days <= 7)
    .sort((a, b) => a.days - b.days);
}

function checkAlerts() {
  const alerts   = getExpiringStudents();
  const critical = alerts.filter(a => a.days <= 3);

  const badge = document.getElementById('alertBadge');
  const dot   = document.getElementById('notifDot');
  if (badge) badge.textContent  = alerts.length;
  if (dot)   dot.style.display  = alerts.length > 0 ? 'block' : 'none';

  if (critical.length > 0) {
    const names = critical.map(a =>
      `• ${a.name} (${a.days === 0 ? 'Expires TODAY' : a.days + ' day(s) left'}) — Parent: ${a.parent}, Ph: ${a.phone}`
    ).join('\n');
    showAlert('⚠️ Fee Expiry Alert!',
      `${critical.length} student(s) fee plan expiring within 3 days:\n\n${names}\n\nPlease contact the parents to renew.`);
  }

  renderAlerts();
}

function renderAlerts() {
  const alerts    = getExpiringStudents();
  const container = document.getElementById('alertsList');
  if (!container) return;

  if (!alerts.length) {
    container.innerHTML = '<p class="empty-state">🎉 No fee alerts. All plans are active.</p>'; return;
  }

  const planLabel = {monthly:'Monthly', quarterly:'Quarterly', halfyearly:'Half Yearly', yearly:'Yearly'};
  container.innerHTML = alerts.map(a => {
    const isCritical = a.days <= 3;
    return `<div class="alert-card ${isCritical ? '' : 'warning'}">
      <div class="alert-badge">${isCritical ? '🔴 CRITICAL' : '🟡 UPCOMING'}</div>
      <h4>${a.name}</h4>
      <p><i class="fas fa-graduation-cap"></i> ${a.class} ${a.course ? '| ' + a.course : ''}</p>
      <p><i class="fas fa-user"></i> Parent: <strong>${a.parent}</strong></p>
      <p><i class="fas fa-phone"></i> ${a.phone}</p>
      <p><i class="fas fa-calendar"></i> Expires: <strong>${formatDate(a.expiry)}</strong></p>
      <p>Plan: ${planLabel[a.feePlan] || a.feePlan}</p>
      <div class="days-left">${a.days === 0 ? 'Expires TODAY!' : a.days + ' day(s) left'}</div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <a href="tel:${a.phone}" class="btn-primary btn-sm" style="text-decoration:none;">
          <i class="fas fa-phone"></i> Call
        </a>
        <a href="https://wa.me/91${a.phone.replace(/\D/g,'')}?text=Dear%20${encodeURIComponent(a.parent)}%2C%20your%20child%20${encodeURIComponent(a.name)}'s%20fee%20plan%20at%20Shahadaz%20Noble%20Academy%20expires%20on%20${encodeURIComponent(formatDate(a.expiry))}.%20Kindly%20visit%20the%20academy%20to%20renew.%20Thank%20you!"
           target="_blank" class="btn-success btn-sm" style="text-decoration:none;">
          <i class="fab fa-whatsapp"></i> WhatsApp
        </a>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// AUTO-INIT
// ============================================================
window.addEventListener('load', () => {
  setTimeout(() => {
    const students = DB.get('students');
    if (students.length > 0) {
      const critical = getExpiringStudents().filter(a => a.days <= 3);
      const badge = document.getElementById('alertBadge');
      const dot   = document.getElementById('notifDot');
      if (badge) badge.textContent = getExpiringStudents().length;
      if (dot && critical.length > 0) dot.style.display = 'block';
    }
  }, 600);
});
