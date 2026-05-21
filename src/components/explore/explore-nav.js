import React, { Fragment } from 'react'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { t } from '../../utils/translation'

const ExploreNav = ({ url, lang }) => {
  let commonProps = {
    activeClassName: 'exp_nav_active',
    className: 'exp_nav_link',
  }

  return (
    <Fragment>
      <ul>
        <li>
          <NavLink to={`${url}`} exact {...commonProps}>
            {t(lang, 'explore', 'users')}
          </NavLink>
        </li>
        <li>
          <NavLink to={`${url}/explore-photos`} {...commonProps}>
            {t(lang, 'explore', 'photos')}
          </NavLink>
        </li>
        <li>
          <NavLink to={`${url}/explore-groups`} {...commonProps}>
            {t(lang, 'explore', 'groups')}
          </NavLink>
        </li>
      </ul>
    </Fragment>
  )
}

ExploreNav.propTypes = {
  url: PropTypes.string.isRequired,
}

const mapStateToProps = state => ({
  lang: state.Language.language
})

export default connect(mapStateToProps)(ExploreNav)
