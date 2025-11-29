you have access to the playwright mcp server, make use of it!!!!!!

use the baseURL as the main url to login, don't read my code, write the test only depend on what you see on the page

I want you to create a simple e2e test, 

First, login by clicking the Player 1 button to simulate a OAuth login, don't click the oauth button, click the mock player 1 button to mock a login, no password is needed

After login, you will see the word "Waiting for players to start" in the middle of the screen, and at the top left of the screen, you will see a room id listed as 血战到底 · Room #74ea2cea-f96f-4551-a44e-cf4af77b5d9e
The string after # is the room id that is different for every game

Then click the "Back to Waiting Room" button to go back to the main screen, then click the join room button in the main screen, you will see the prompt Join a Game
Pick an open table below or enter a room ID manually. Also you can see a text saying Open Tables

then click the "back" button on the top right to go back to the main screen.

Then click the "Match History" button on the main page to go to the match history page. You will see a Match History title on the top. Click the ← Back button on top left to go back to the main screen

then click the Log Out button the logout to logout to finish the e2e test.