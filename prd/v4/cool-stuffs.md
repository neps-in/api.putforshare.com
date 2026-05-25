# AI Cool Features

## AI Features

Instead of searching for book title. People can search for a problem and can find list of books as solution

looking for depression remedy - AI can suggest list of books.

Looking for beginner level spoken english guide - AI can suggest books.

## Read list

Read list is a collection of books to be read in order to gain mastery on a subject or topic

1. Logged in Users can create read list
2. Guest Users can create a read list
3. A read list has a readlist name - "Read list name" is a collection of books in a specific order you can arrange or rearrange the order of the books.
4. Have a button to book in book listing page and book detail page - "Add to
   ReadList"
5. There should be public and private read list.
6. User can add any book to any read list by clicking the button "Add to Read list".
7. User can add any number of books to a read list.
8. One user can have many readlist.
9. readlist model - ( uuid, user - fk to user model, bookid, book isbn, book info like title, authors, etc, sort order , created_on , updated_on )
10. Readlist page - to list available read list.

## Book is Outdated - Not useful - button

1. There can be a button adjacent to a book in listing page and detail page.
2. Clicking on that button adds a value to that button and it records from which IP it is being clicked and it should not be duplicated or clicked multiple times.
3. User should not be able to click that button again.
4. You should count the total number of count for that particular book or a particular item and then record it and then record it with the timestamp and then from which all date it got clicked by which all the users user id and along with that and it should be plotted as a graph

To promote the usage of this feature - we will list as
Book is Outdated - mark this book as outdated and we will not show in your search result.
Also have a checkbox in a filter - Don't show outdated books
