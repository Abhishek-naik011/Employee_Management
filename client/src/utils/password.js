const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIALS = '!@#$%^&*()-_=+[]{}|;:,.?/~';
const ALL_CHARACTERS = `${UPPERCASE}${LOWERCASE}${NUMBERS}${SPECIALS}`;

const getRandomIntInclusive = (min, max) => {
  const range = max - min + 1;
  const randomValues = new Uint32Array(1);
  window.crypto.getRandomValues(randomValues);
  return min + (randomValues[0] % range);
};

const pickCharacter = (characters) => {
  const index = getRandomIntInclusive(0, characters.length - 1);
  return characters[index];
};

const shuffleCharacters = (characters) => {
  const shuffled = [...characters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIntInclusive(0, index);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

export const generateTemporaryPassword = () => {
  const passwordLength = getRandomIntInclusive(8, 12);
  const passwordCharacters = [
    pickCharacter(UPPERCASE),
    pickCharacter(LOWERCASE),
    pickCharacter(NUMBERS),
    pickCharacter(SPECIALS),
  ];

  while (passwordCharacters.length < passwordLength) {
    passwordCharacters.push(pickCharacter(ALL_CHARACTERS));
  }

  return shuffleCharacters(passwordCharacters).join('');
};