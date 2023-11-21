Please edit this template and commit to the master branch for your user stories submission.   
Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-21w2-intro-to-se/project/checkpoint-3).

## User Story 1
As a UBC student, I want to get the course with the highest average in a certain department, so that I can consider taking that course.


#### Definitions of Done(s)
Scenario 1: Entered a correct course department
Given: The user selects the "search highest average course" radio button
When: The user enters a valid dept code and click the "submit" button
Then: The application remains on the page and shows the full name and the average of that course

Scenario 1: Entered an incorrect course department
Given: The user selects the "search the highest average course" radio button
When: The user enters an invalid dept code and click the "submit" button
Then: The application remains on the page and shows an alert: "Please enter a valid department code"


## User Story 2
As a UBC student, I want to search for the average grade of a certain course, so that I can evaluate whether to take the course.


#### Definitions of Done(s)
Scenario 1: Entered a correct course code (department + id)
Given: The user selects the "show course average" radio button
When: The user enters a valid course name and click the "submit" button 
Then: The application remains on the page and shows the course title and the average grade of all sections of that course

Scenario 2: Entered an incorrect course code (department + id)
Given: The user selects the "show course average" radio button
When: The user enters an invalid course name and click the "show average grade" button
Then: The application remains on the page and shows a message: "Please enter a valid course code"

## Others
You may provide any additional user stories + DoDs in this section for general TA feedback.  
Note: These will not be graded.
