import passport from 'passport';

export default function signup(req) {
  return new Promise(( resolve, reject) => {
    passport.authenticate('signup', (err, user, info) => {
      if (err) {
        return reject(err);
      }
      if (!user) {
        return reject({
          message: info.message,
          status: 403
        });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return reject('Issue logging in.');
        }
        resolve(user);
      });
    })(req);
  });
}
