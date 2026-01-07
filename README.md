# Mentor Booking (Node.js + AWS)

**MentorBooking** is a platform that helps students to connect with experienced mentors for one-on-one learning sessions.

Students can search for mentors, check when they’re available and book a time that works for them. Mentors can easily manage their schedules and list the times they’re available for sessions. Administrators have tools to manage mentor profiles and keep track of bookings across the platform.

The goal is to make the mentorship process smooth, organized, and easy for everyone involved.

## 📚 Table of Contents
- [Technologies Used](#-technologies-used)
- [Roles](#-roles)
- [System Architecture](#-system-architecture)
- [Student Actions](#-student-actions)
- [Mentor Actions](#-mentor-actions)
- [Admin Actions](#-admin-actions)
- [Development Timeline](#-development-timeline)
- [Bonus](#-bonus)

## 🛠️ Technologies Used

**MentorBooking** is built using a modern, serverless architecture on AWS with Node.js / TypeScript. The system is designed for scalability, simplicity, and production-readiness.

### Backend

- [Node.js](https://nodejs.org/en) – Application logic and API handlers
- [TypeScript](https://www.typescriptlang.org/docs/) – Strongly typed JavaScript for better maintainability   
- [Amazon API Gateway](https://docs.aws.amazon.com/apigateway/) – Exposes RESTful endpoints  
- [AWS Lambda](https://docs.aws.amazon.com/lambda/) – Executes business logic, async jobs, and scheduled tasks  
- [Amazon DynamoDB](https://docs.aws.amazon.com/dynamodb/) – Stores the data required within the application
- [Amazon S3](https://docs.aws.amazon.com/s3/) – Manages file storage for CSV uploads and exports  
- [Amazon SQS](https://docs.aws.amazon.com/sqs/) – Handles asynchronous task queues (e.g., import/export jobs)  
- [Amazon SNS](https://docs.aws.amazon.com/sns/) – Sends email notifications to admins  
- [Amazon Cognito** *(optional)*](https://docs.aws.amazon.com/cognito/) – Provides user authentication and role-based access control  

### Infrastructure

- [AWS CDK](https://docs.aws.amazon.com/cdk/) – Infrastructure as Code (IaC)  
- [CloudWatch *(optional)*](https://docs.aws.amazon.com/cloudwatch/) – Logs, metrics, and monitoring for Lambda and other services  

### Tooling & Dev Experience

- [Jest](https://jestjs.io/) – Unit and integration testing  
- [ESLint *(optional)*](https://eslint.org/) + [Prettier *(optional)*](https://prettier.io/) – Code linting and formatting  
- [GitHub Actions](https://docs.github.com/en/actions) or any other CI/CD provider *(optional)* – CI/CD pipelines for testing and deployment

## 👥 Roles

| Role     | Description |
|-|-|
| **Student** | Browse mentors, view availability, book and cancel sessions |
| **Mentor**  | Define available time slots |
| **Admin**   | Bulk import mentors, export bookings to CSV, receive notifications |

## 🏛️ System Architecture

The diagram below illustrates the high-level architecture of **MentorBooking**, grouped by functional domains for better clarity:

![MentorBooking Architecture Diagram](./img/architecture.jpg)

- **Booking API** – Exposes endpoints for all student and admin actions via API Gateway and Lambda.
- **Importing Mentors** – Allows admins to upload a CSV file with mentors, which is then processed and saved to DynamoDB.
- **Exporting Bookings** – Lets admins export booking data to a downloadable CSV file stored in S3.
- **Student Booking Flow** – Handles session booking and cancellation.
- **Notifications Service** – Responsible for sending notifications via email.
- **Data Storage** – DynamoDB tables store core data for mentors, students, time slots and bookings.

> ℹ️ **Note:** The diagram shows multiple Booking API Lambda functions for simplicity, but it's up to you whether to implement a single Lambda handler for all endpoints or a separate Lambda per operation. The recommended approach is to consolidate them into a **single Lambda** for better cold-start performance and easier deployment management.


## 🎓 Student Actions

Students use the system to connect with mentors and manage their sessions.

### 1. View a List of Available Mentors

Returns a list of all active mentors. Students can filter results by skills, experience, or other optional attributes.

- **API Endpoint:** `GET /mentors`
- **AWS Services:** API Gateway, Lambda, DynamoDB
- **How it Works:**
  1. API Gateway routes the request to a Lambda function.
  2. Lambda queries the **Mentors** table in DynamoDB with optional filters.
  3. The list is returned to the student.

### 2. View a Mentor’s Available Time Slots

Fetches all upcoming available time slots for a given mentor.

- **API Endpoint:** `GET /mentors/{mentorId}/timeslots`
- **AWS Services:** API Gateway, Lambda, DynamoDB
- **How it Works:**
  1. API Gateway triggers a Lambda with the mentor ID as a path parameter.
  2. Lambda queries the **TimeSlots** table for the specified mentor, filtering for available future slots.
  3. Returns a list of matching time slots to the student.

### 3. Book a Mentorship Session

Allows a student to reserve a session with a mentor at a selected date and time.

- **API Endpoint:** `POST /bookings`
- **AWS Services:** API Gateway, Lambda, DynamoDB, SQS, SNS
- **How it Works:**
  1. API Gateway invokes a Lambda function with the booking request payload.
  2. Lambda:
     - Validates the mentor and requested time slot.
     - Ensures there are no existing overlapping bookings.
     - Creates a new record in the **Bookings** table in DynamoDB.
     - Marks the selected time slot as "booked".
  3. Pushes a `booking.created` event to the **Notifications SQS Queue** for post-processing.
     - A separate **Notification Lambda** subscribed to this queue sends **confirmation emails** via **SNS** to both the student and the mentor.

### 4. Cancel a Previously Booked Session

Allows the student to cancel a session they’ve previously booked.

- **API Endpoint:** `DELETE /bookings/{bookingId}`
- **AWS Services:** API Gateway, Lambda, DynamoDB, SQS, SNS
- **How it Works:**
  1. API Gateway invokes a Lambda function with the booking ID.
  2. Lambda:
     - Verifies the booking exists and is owned by the requesting student.
     - Deletes the record from the **Bookings** table.
     - Updates the corresponding time slot to "available" again.
  3. Pushes a `booking.cancelled` event to the same **Notifications SQS Queue** for post-processing.
     - The **Notification Lambda** picks it up and sends a cancellation email to both student and mentor via **SNS**.

### 5. Receive Confirmation Notification

After a student books or cancels a session, they receive an email confirmation.

- **Trigger:** `booking.created` or `booking.cancelled` events pushed to SQS
- **AWS Services:** SQS, Lambda, SNS
- **How it Works:**
  1. The **Notification Lambda** listens to booking events from the **Notifications SQS Queue**.
  2. It generates a personalized email message based on the event type and booking details.
  3. Sends the email via **SNS**, notifying both student and mentor.

### 6. (Optional) View Upcoming and Past Bookings

Returns a list of the student’s own bookings, optionally filtered by session date (e.g., upcoming or historical).

- **API Endpoint:** `GET /bookings`
- **AWS Services:** API Gateway, Lambda, DynamoDB
- **How it Works:**
  1. The request includes the student’s identity (via auth context or parameter).
  2. Lambda queries the **Bookings** table by student ID.
  3. Results are optionally filtered by session date (e.g., greater than today).
  4. Returns all relevant booking records.

## 👨‍🏫 Mentor Actions

Mentors manage their availability and stay informed about upcoming sessions.

### 1. Define Available Time Slots

Allows a mentor to create one or more time slots during which they are available for sessions.

- **API Endpoint:** `POST /mentors/{mentorId}/timeslots`
- **AWS Services:** API Gateway, Lambda, DynamoDB
- **How it Works:**
  1. API Gateway receives the request with the mentor ID and time slot details.
  2. Lambda:
     - Validates that the mentor exists and the time slots are in the future.
     - Ensures no overlapping time slots exist for the same mentor.
     - Inserts new records into the **TimeSlots** table in DynamoDB.
  3. Returns a success response with the newly created slot(s).


### 2. View Booked Sessions

Returns a list of upcoming sessions that have been booked with the mentor.

- **API Endpoint:** `GET /mentors/{mentorId}/bookings`
- **AWS Services:** API Gateway, Lambda, DynamoDB
- **How it Works:**
  1. API Gateway triggers a Lambda using the mentor ID.
  2. Lambda queries the **Bookings** table in DynamoDB for all sessions associated with the given mentor ID.
  3. Filters can be applied to show only future or past sessions.
  4. Returns the list of relevant bookings.

### 3. Receive Notifications When a Session Is Booked or Cancelled

Mentors are notified via email when a student books or cancels a session with them.

- **Trigger:** `booking.created` or `booking.cancelled` event
- **AWS Services:** SQS, Lambda, SNS
- **How it Works:**
  1. After a booking is created or cancelled, a message is pushed to the SQS **Notifications SQS Queue**.
  2. A **Notification Lambda** processes the message and prepares an email for the mentor.
  3. The message is published to an **SNS topic** that delivers the email to the mentor.

### 4. (Optional) Update or Remove Previously Defined Time Slots

Allows a mentor to update or delete their existing availability slots.

- **API Endpoints:**
  - `PUT /mentors/{mentorId}/timeslots/{slotId}` – update
  - `DELETE /mentors/{mentorId}/timeslots/{slotId}` – remove
- **AWS Services:** API Gateway, Lambda, DynamoDB
- **How it Works:**
  1. Lambda verifies that the time slot exists and belongs to the specified mentor.
  2. For updates:
     - Ensures the new time does not conflict with existing slots or bookings.
     - Updates the slot in the **TimeSlots** table.
  3. For deletions:
     - Checks that the slot is not already booked.
     - Deletes the record from the **TimeSlots** table.

## 🧑‍✈️ Admin Actions

Admins are responsible for managing mentor data and overseeing system activity.

### 1. Bulk Import Mentors Using a CSV File

Allows an admin to onboard multiple mentors by uploading a structured CSV file via an API endpoint.

- **API Endpoint:** `POST /import/mentors`
- **AWS Services:** API Gateway, Lambda, S3, DynamoDB, SQS
- **How it Works:**
  1. Admin calls the API with a `.csv` file (e.g., `mentors.csv`) as form data.
  2. API Gateway routes the request to a Lambda function.
  3. This Lambda:
     - Saves the uploaded file to **S3**, under a prefix like `mentors-import/{timestamp}/mentors.csv`.
     - Returns a confirmation response.
  4. The S3 upload triggers a second **CSV Processing Lambda**.
  5. This Lambda:
     - Downloads the file from S3.
     - Parses and validates the CSV content in memory.
     - Writes valid mentor records directly to the **Mentors** table in DynamoDB.
     - Collects summary statistics (e.g., total processed, success, failure count).
  6. Once processing is complete:
     - Constructs a `mentors.imported` event with the summary data.
     - Pushes the event to the **Notifications SQS Queue**.
  7. The **Notification Lambda** (subscribed to this queue):
     - Receives the `mentors.imported` event.
     - Composes and sends an **email notification** to the admin via SNS including import status (success/failure counts)

### 2. Trigger Export of All Bookings as a Downloadable CSV

Allows an admin to generate and download a CSV file containing all mentorship bookings.

- **API Endpoint:** `POST /exports/bookings`
- **AWS Services:** API Gateway, Lambda, SQS, DynamoDB, S3
- **How it Works:**
  1. Admin triggers the export by calling the API endpoint.
  2. API Gateway invokes a Lambda function that enqueues a job into the **Bookings Export SQS queue**.
  3. A separate **Bookings Export Lambda** reads from the queue, then:
     - Queries the **Bookings** table in DynamoDB.
     - Generates a `.csv` file with all booking records.
     - Uploads the CSV to **S3** under a secure path (e.g., `booking-exports/{timestamp}/bookings.csv`).
  4. Once the export is complete:
     - It creates a `bookings.exported` event with metadata:
       - Export status
       - Record count
       - S3 download link
     - Pushes this event to the **Notifications SQS Queue**.
  5. The **Notification Lambda**:
     - Picks up the `bookings.exported` event.
     - Sends an **email to the admin** with a summary and download link.

## 📆 Development Timeline

This 4-week plan is designed to help you build the **MentorBooking** platform step by step, focusing on key backend flows, AWS integrations, and production-readiness.  
While this is the **recommended plan**, you’re free to complete the tasks in whatever sequence works best for you.

### Week 1: Project Setup & Student Core Flows

#### Goals
- Set up the backend project
- Implement basic student flows (view mentors, view time slots)
- Deploy core AWS infrastructure via CDK – API Gateway, Lambda, DynamoDB

#### Tasks
- [ ] Scaffold a new TypeScript + Node.js backend
- [ ] (Optional) Configure Prettier + ESLint
- [ ] Set up an AWS CDK project for infrastructure
- [ ] Create DynamoDB tables
- [ ] Implement `GET /mentors`
- [ ] Implement `GET /mentors/{mentorId}/timeslots`
- [ ] Add sample seed data (mentors + time slots)
- [ ] Deploy API Gateway + Lambda integrations using CDK
- [ ] Write unit tests for all implemented logic using Jest

#### Outcomes
- Students can browse mentors and available time slots
- CDK infrastructure is deployed to AWS
- DynamoDB tables, Lambda, and API Gateway are integrated

### Week 2: Booking & Notifications

#### Goals
- Allow students to book and cancel sessions
- Trigger email notifications via SQS + SNS

#### Tasks
- [ ] Implement `POST /bookings`
- [ ] Implement `DELETE /bookings/{bookingId}`
- [ ] Create a Notifications SQS Queue + Notification Lambda
- [ ] Send booking emails via SNS
- [ ] Validate slot conflicts and booking ownership
- [ ] Implement event formats: `booking.created`, `booking.cancelled`
- [ ] Add unit tests for the new logic

#### Outcomes
- Students can book and cancel sessions
- Booking updates are reflected in DynamoDB
- Notifications (emails) are sent via SNS

### Week 3: Mentor & Admin Flows

#### Goals
- Let mentors manage availability
- Enable admin CSV import for mentor onboarding

#### Tasks
- [ ] Implement `POST /mentors/{mentorId}/timeslots`
- [ ] Implement `GET /mentors/{mentorId}/bookings`
- [ ] Implement `POST /import/mentors`
- [ ] Add a CSV Processing Lambda (triggered by S3)
- [ ] Save valid mentor records in DynamoDB
- [ ] Push `mentors.imported` event to Notifications SQS
- [ ] Notify admins via email with import results

#### Outcomes
- Mentors can define availability
- Admins can import mentors via CSV
- Summary emails are sent post-import

### Week 4: Booking Export, Polish, & Deployment

#### Goals
- Complete admin flows
- Polish features and add optional enhancements
- Finalize deployment and documentation

#### Tasks
- [ ] Implement `POST /exports/bookings`
- [ ] Generate and upload the bookings CSV to S3
- [ ] Send export summary to the admin via email
- [ ] Implement `GET /bookings` for students
- [ ] Implement `PUT` and `DELETE` for mentor time slots
- [ ] Improve test coverage and logging
- [ ] Finalize the solution and refactor the code if needed

#### Outcomes
- Admins can export bookings as CSV
- All flows are complete and tested
- The project is production-ready

## 💡 Bonus
- Implement Cognito-based role access
- Add a simple React frontend using AWS Amplify
- Integrate GitHub Actions for CI/CD
- Add CloudWatch metrics and alarms
