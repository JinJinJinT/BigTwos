CREATE TABLE friends (
  	user Varchar(50),
	name Varchar(50),
  	salt Binary(16),
  	hash Binary(16),
  	PRIMARY KEY (user)
);

CREATE TABLE players (
	name VARCHAR(50) REFERENCES friends(name),
	user Varchar(50) REFERENCES friends(user),
  	pid varchar(10),
	token Varchar(767),
  	cardsLeft int,
  	nextPlayer,
  	PRIMARY KEY (pid, user)
);