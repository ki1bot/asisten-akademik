package main

import "time"

type Profile struct {
	ID         string  `gorm:"column:id;primaryKey" json:"id"`
	UserID     string  `gorm:"column:userId;uniqueIndex" json:"-"`
	Name       string  `gorm:"column:name" json:"name"`
	StudentID  *string `gorm:"column:studentId" json:"studentId"`
	University *string `gorm:"column:university" json:"university"`
	Faculty    *string `gorm:"column:faculty" json:"faculty"`
	Major      *string `gorm:"column:major" json:"major"`
	Timezone   string  `gorm:"column:timezone" json:"timezone"`
}

func (Profile) TableName() string {
	return "Profile"
}

type User struct {
	ID              string     `gorm:"column:id;primaryKey" json:"id"`
	Email           string     `gorm:"column:email;uniqueIndex" json:"email"`
	PasswordHash    string     `gorm:"column:passwordHash" json:"-"`
	Role            string     `gorm:"column:role" json:"role"`
	EmailVerifiedAt *time.Time `gorm:"column:emailVerifiedAt" json:"emailVerifiedAt"`
	CreatedAt       time.Time  `gorm:"column:createdAt" json:"-"`
	UpdatedAt       time.Time  `gorm:"column:updatedAt" json:"-"`
	Profile         *Profile   `gorm:"foreignKey:UserID" json:"profile"`
}

func (User) TableName() string {
	return "User"
}

type Session struct {
	ID               string    `gorm:"column:id;primaryKey" json:"id"`
	UserID           string    `gorm:"column:userId;index" json:"-"`
	RefreshTokenHash string    `gorm:"column:refreshTokenHash" json:"-"`
	DeviceName       *string   `gorm:"column:deviceName" json:"deviceName"`
	IPAddress        *string   `gorm:"column:ipAddress" json:"ipAddress"`
	UserAgent        *string   `gorm:"column:userAgent" json:"userAgent"`
	ExpiresAt        time.Time `gorm:"column:expiresAt;index" json:"expiresAt"`
	LastUsedAt       time.Time `gorm:"column:lastUsedAt" json:"lastUsedAt"`
	CreatedAt        time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt        time.Time `gorm:"column:updatedAt" json:"-"`
	User             User      `gorm:"foreignKey:UserID" json:"-"`
}

func (Session) TableName() string {
	return "Session"
}

type VerificationToken struct {
	ID        string     `gorm:"column:id;primaryKey"`
	UserID    string     `gorm:"column:userId;index"`
	TokenHash string     `gorm:"column:tokenHash;uniqueIndex"`
	ExpiresAt time.Time  `gorm:"column:expiresAt"`
	UsedAt    *time.Time `gorm:"column:usedAt"`
	CreatedAt time.Time  `gorm:"column:createdAt"`
}

func (VerificationToken) TableName() string {
	return "VerificationToken"
}

type PasswordResetToken struct {
	ID        string     `gorm:"column:id;primaryKey"`
	UserID    string     `gorm:"column:userId;index"`
	TokenHash string     `gorm:"column:tokenHash;uniqueIndex"`
	ExpiresAt time.Time  `gorm:"column:expiresAt"`
	UsedAt    *time.Time `gorm:"column:usedAt"`
	CreatedAt time.Time  `gorm:"column:createdAt"`
}

func (PasswordResetToken) TableName() string {
	return "PasswordResetToken"
}

type SemesterCount struct {
	Courses int64 `json:"courses"`
}

type Semester struct {
	ID           string         `gorm:"column:id;primaryKey" json:"id"`
	UserID       string         `gorm:"column:userId;index" json:"-"`
	Name         string         `gorm:"column:name" json:"name"`
	AcademicYear string         `gorm:"column:academicYear" json:"academicYear"`
	Type         string         `gorm:"column:type" json:"type"`
	StartDate    time.Time      `gorm:"column:startDate" json:"startDate"`
	EndDate      time.Time      `gorm:"column:endDate" json:"endDate"`
	IsActive     bool           `gorm:"column:isActive" json:"isActive"`
	CreatedAt    time.Time      `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt    time.Time      `gorm:"column:updatedAt" json:"updatedAt"`
	Courses      []Course       `gorm:"foreignKey:SemesterID" json:"courses,omitempty"`
	Count        *SemesterCount `gorm:"-" json:"_count,omitempty"`
}

func (Semester) TableName() string {
	return "Semester"
}

type CourseCount struct {
	Schedules   int64 `json:"schedules,omitempty"`
	Assignments int64 `json:"assignments,omitempty"`
	Exams       int64 `json:"exams,omitempty"`
	Attendances int64 `json:"attendances,omitempty"`
	Grades      int64 `json:"grades,omitempty"`
}

type Course struct {
	ID          string       `gorm:"column:id;primaryKey" json:"id"`
	UserID      string       `gorm:"column:userId;index" json:"-"`
	SemesterID  string       `gorm:"column:semesterId;index" json:"semesterId"`
	Code        string       `gorm:"column:code" json:"code"`
	Name        string       `gorm:"column:name" json:"name"`
	Credits     int          `gorm:"column:credits" json:"credits"`
	Lecturer    *string      `gorm:"column:lecturer" json:"lecturer"`
	Room        *string      `gorm:"column:room" json:"room"`
	Color       string       `gorm:"column:color" json:"color"`
	Notes       *string      `gorm:"column:notes" json:"notes"`
	CreatedAt   time.Time    `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time    `gorm:"column:updatedAt" json:"updatedAt"`
	Semester    *Semester    `gorm:"foreignKey:SemesterID" json:"semester,omitempty"`
	Schedules   []Schedule   `gorm:"foreignKey:CourseID" json:"schedules,omitempty"`
	Assignments []Assignment `gorm:"foreignKey:CourseID" json:"assignments,omitempty"`
	Exams       []Exam       `gorm:"foreignKey:CourseID" json:"exams,omitempty"`
	Count       *CourseCount `gorm:"-" json:"_count,omitempty"`
}

func (Course) TableName() string {
	return "Course"
}

type Schedule struct {
	ID              string    `gorm:"column:id;primaryKey" json:"id"`
	UserID          string    `gorm:"column:userId;index" json:"-"`
	CourseID        string    `gorm:"column:courseId;index" json:"courseId"`
	DayOfWeek       int       `gorm:"column:dayOfWeek" json:"dayOfWeek"`
	StartTime       string    `gorm:"column:startTime" json:"startTime"`
	EndTime         string    `gorm:"column:endTime" json:"endTime"`
	Room            *string   `gorm:"column:room" json:"room"`
	LectureType     string    `gorm:"column:lectureType" json:"lectureType"`
	OnlineURL       *string   `gorm:"column:onlineUrl" json:"onlineUrl"`
	ReminderMinutes *int      `gorm:"column:reminderMinutes" json:"reminderMinutes"`
	CreatedAt       time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt       time.Time `gorm:"column:updatedAt" json:"updatedAt"`
	Course          *Course   `gorm:"foreignKey:CourseID" json:"course,omitempty"`
}

func (Schedule) TableName() string {
	return "Schedule"
}

type Assignment struct {
	ID            string     `gorm:"column:id;primaryKey" json:"id"`
	UserID        string     `gorm:"column:userId;index" json:"-"`
	CourseID      string     `gorm:"column:courseId;index" json:"courseId"`
	Title         string     `gorm:"column:title" json:"title"`
	Description   *string    `gorm:"column:description" json:"description"`
	Deadline      time.Time  `gorm:"column:deadline" json:"deadline"`
	Priority      string     `gorm:"column:priority" json:"priority"`
	Status        string     `gorm:"column:status" json:"status"`
	AttachmentURL *string    `gorm:"column:attachmentUrl" json:"attachmentUrl"`
	ReminderAt    *time.Time `gorm:"column:reminderAt" json:"reminderAt"`
	SubmittedAt   *time.Time `gorm:"column:submittedAt" json:"submittedAt"`
	CreatedAt     time.Time  `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt     time.Time  `gorm:"column:updatedAt" json:"updatedAt"`
	Course        *Course    `gorm:"foreignKey:CourseID" json:"course,omitempty"`
}

func (Assignment) TableName() string {
	return "Assignment"
}

type Exam struct {
	ID         string     `gorm:"column:id;primaryKey" json:"id"`
	UserID     string     `gorm:"column:userId;index" json:"-"`
	CourseID   string     `gorm:"column:courseId;index" json:"courseId"`
	Type       string     `gorm:"column:type" json:"type"`
	Title      string     `gorm:"column:title" json:"title"`
	ExamDate   time.Time  `gorm:"column:examDate" json:"examDate"`
	StartTime  *string    `gorm:"column:startTime" json:"startTime"`
	EndTime    *string    `gorm:"column:endTime" json:"endTime"`
	Room       *string    `gorm:"column:room" json:"room"`
	Topics     *string    `gorm:"column:topics" json:"topics"`
	ReminderAt *time.Time `gorm:"column:reminderAt" json:"reminderAt"`
	CreatedAt  time.Time  `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt  time.Time  `gorm:"column:updatedAt" json:"updatedAt"`
	Course     *Course    `gorm:"foreignKey:CourseID" json:"course,omitempty"`
}

func (Exam) TableName() string {
	return "Exam"
}

type Attendance struct {
	ID          string    `gorm:"column:id;primaryKey" json:"id"`
	UserID      string    `gorm:"column:userId;index" json:"-"`
	CourseID    string    `gorm:"column:courseId;index" json:"courseId"`
	MeetingDate time.Time `gorm:"column:meetingDate" json:"meetingDate"`
	Status      string    `gorm:"column:status" json:"status"`
	Notes       *string   `gorm:"column:notes" json:"notes"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`
	Course      *Course   `gorm:"foreignKey:CourseID" json:"course,omitempty"`
}

func (Attendance) TableName() string {
	return "Attendance"
}

type GradeComponent struct {
	ID        string    `gorm:"column:id;primaryKey" json:"id"`
	GradeID   string    `gorm:"column:gradeId;index" json:"-"`
	Name      string    `gorm:"column:name" json:"name"`
	Score     float64   `gorm:"column:score" json:"score"`
	Weight    float64   `gorm:"column:weight" json:"weight"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt,omitempty"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt,omitempty"`
}

func (GradeComponent) TableName() string {
	return "GradeComponent"
}

type Grade struct {
	ID         string           `gorm:"column:id;primaryKey" json:"id"`
	UserID     string           `gorm:"column:userId;index" json:"-"`
	CourseID   string           `gorm:"column:courseId" json:"courseId"`
	FinalScore *float64         `gorm:"column:finalScore" json:"finalScore"`
	Letter     *string          `gorm:"column:letter" json:"letter"`
	Weight     *float64         `gorm:"column:weight" json:"weight"`
	CreatedAt  time.Time        `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt  time.Time        `gorm:"column:updatedAt" json:"updatedAt"`
	Course     *Course          `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	Components []GradeComponent `gorm:"foreignKey:GradeID" json:"components"`
}

func (Grade) TableName() string {
	return "Grade"
}

type Notification struct {
	ID           string     `gorm:"column:id;primaryKey" json:"id"`
	UserID       string     `gorm:"column:userId;index" json:"-"`
	Type         string     `gorm:"column:type" json:"type"`
	Title        string     `gorm:"column:title" json:"title"`
	Message      string     `gorm:"column:message" json:"message"`
	ReadAt       *time.Time `gorm:"column:readAt" json:"readAt"`
	ScheduledFor *time.Time `gorm:"column:scheduledFor" json:"scheduledFor"`
	CreatedAt    time.Time  `gorm:"column:createdAt" json:"createdAt"`
}

func (Notification) TableName() string {
	return "Notification"
}
